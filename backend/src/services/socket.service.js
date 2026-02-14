import { Server } from "socket.io";
import redis from "../config/redis.js";
import Device from "../models/Device.js";
import { generateNonce, verifySignature } from "./deviceAuth.service.js";
import pkg from "crystals-kyber";
const { Kyber768 } = pkg;
import crypto from "crypto";

// ──────────────────────────────────────────────
// AES-256-GCM Encrypt / Decrypt helpers
// ──────────────────────────────────────────────

const decryptMessage = (encryptedObj, sharedSecretHex) => {
  try {
    const key = Buffer.from(sharedSecretHex, "hex").subarray(0, 32);
    const iv = Buffer.from(encryptedObj.iv, "hex");
    const tag = Buffer.from(encryptedObj.tag, "hex");
    const encryptedText = Buffer.from(encryptedObj.data, "hex");

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString("utf8");
  } catch (err) {
    console.error("AES Decrypt Error:", err.message);
    return null;
  }
};

const encryptMessage = (plaintext, sharedSecretHex) => {
  try {
    const key = Buffer.from(sharedSecretHex, "hex").subarray(0, 32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    let encrypted = cipher.update(plaintext, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const tag = cipher.getAuthTag();

    return {
      iv: iv.toString("hex"),
      tag: tag.toString("hex"),
      data: encrypted.toString("hex"),
    };
  } catch (err) {
    console.error("AES Encrypt Error:", err.message);
    return null;
  }
};

// Generate SHA-256 hash of MAC address
const hashMacAddress = (mac) => {
  return crypto.createHash("sha256").update(mac).digest("hex");
};

// ──────────────────────────────────────────────
// Topology Helper — exported for use in routes
// ──────────────────────────────────────────────

export const getTopologyForOrg = async (orgId) => {
  const devices = await Device.find({ organizationId: orgId }).select(
    "macAddress name status lastSeen meshRole rssi parentMac ipAddress firmwareVersion"
  );

  return devices.map((d) => ({
    id: d._id,
    mac: d.macAddress,
    name: d.name,
    status: d.status,
    lastSeen: d.lastSeen,
    meshRole: d.meshRole,
    rssi: d.rssi,
    parentMac: d.parentMac,
    ipAddress: d.ipAddress,
    firmwareVersion: d.firmwareVersion,
  }));
};

// ──────────────────────────────────────────────
// Socket.IO Initialization
// ──────────────────────────────────────────────

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  console.log("Socket.IO initialized");

  const deviceNamespace = io.of("/devices");
  const frontendNamespace = io.of("/frontend");

  // ──────────────────────────────────────────
  // DEVICE NAMESPACE — mTLS + Kyber Auth Flow
  // ──────────────────────────────────────────

  deviceNamespace.on("connection", (socket) => {
    console.log(`[Device] Connected: ${socket.id}`);

    // Per-socket auth state
    socket.isAuthenticated = false;
    socket.macAddress = null;
    socket.deviceData = null;
    socket.nonce = null;
    socket.kyberSK = null;
    socket.sharedSecret = null;

    // ── auth:init ──────────────────────────
    socket.on("auth:init", async ({ macAddress, orgId }) => {
      console.log(`[Device] Auth Init from ${macAddress}`);
      socket.macAddress = macAddress;

      try {
        // Step 1: Check Redis fast path
        const cachedAuth = await redis.hgetall(`device:${macAddress}:auth`);

        let deviceDoc = null;

        if (cachedAuth && cachedAuth.sharedSecret) {
          console.log(`[Auth] Redis HIT for ${macAddress} — fast path`);
          // We still need device doc for orgId — fetch without sharedSecret overhead
          deviceDoc = await Device.findOne({ macAddress });
          if (deviceDoc) {
            // Attach cached sharedSecret to deviceDoc for signature verification
            deviceDoc._cachedSecret = cachedAuth.sharedSecret;
          }
        }

        if (!deviceDoc) {
          // Step 2: Redis miss → full lookup including sharedSecret
          console.log(`[Auth] Redis MISS for ${macAddress} — full auth`);
          deviceDoc = await Device.findOne({ macAddress }).select("+sharedSecret");
        }

        if (!deviceDoc) {
          console.warn(`[Auth] Device ${macAddress} not registered`);
          socket.emit("auth:failed", { reason: "Device not registered" });
          socket.disconnect();
          return;
        }

        socket.deviceData = deviceDoc;

        // Step 3: Generate Kyber-768 keypair
        const { publicKey: pk, secretKey: sk } = Kyber768.keyPair();
        socket.kyberSK = sk;

        const pkHex = Buffer.from(pk).toString("hex");

        // Step 4: Generate nonce
        const nonce = generateNonce();
        socket.nonce = nonce;

        // Cache nonce in Redis with short TTL
        const macHash = hashMacAddress(macAddress);
        await redis.set(`auth:nonce:${macHash}`, nonce, "EX", 30);

        // Step 5: Send challenge
        socket.emit("auth:challenge", { nonce, pk: pkHex });
        console.log(`[Auth] Challenge sent to ${macAddress}`);
      } catch (err) {
        console.error("[Auth] Error during auth:init:", err);
        socket.emit("auth:failed", { reason: "Internal error" });
      }
    });

    // ── auth:response ──────────────────────
    socket.on("auth:response", async ({ signature, ciphertext }) => {
      const { macAddress, deviceData, nonce, kyberSK } = socket;

      if (!macAddress || !deviceData || !nonce || !kyberSK) {
        socket.emit("auth:failed", { reason: "No auth session initialized" });
        return;
      }

      try {
        // Step 1: Kyber decapsulation — derive shared secret
        let sharedSecretHex = null;
        try {
          const ct = new Uint8Array(Buffer.from(ciphertext, "hex"));
          const ss = Kyber768.decapsulate(ct, kyberSK);
          sharedSecretHex = Buffer.from(ss).toString("hex");
          console.log(`[Kyber] Shared Secret Established: ${sharedSecretHex.substring(0, 10)}...`);
        } catch (err) {
          console.error("[Kyber] Decapsulation Failed:", err);
          socket.emit("auth:failed", { reason: "Kyber decapsulation failed" });
          socket.disconnect();
          return;
        }

        // Step 2: Verify HMAC signature
        const secretToUse = deviceData._cachedSecret || deviceData.sharedSecret;
        if (!secretToUse) {
          // Fallback to global org key
          const globalSecret = await redis.get("org:default_secret");
          if (!globalSecret) {
            console.warn(`[Auth] No shared secret available for ${macAddress}`);
            socket.emit("auth:failed", { reason: "No shared secret" });
            socket.disconnect();
            return;
          }
        }

        const payload = nonce + macAddress;
        const isValid = verifySignature(payload, signature, secretToUse || await redis.get("org:default_secret"));

        if (!isValid) {
          console.warn(`[Auth] Invalid signature from ${macAddress}`);
          socket.emit("auth:failed", { reason: "Invalid signature" });
          socket.disconnect();
          return;
        }

        // Step 3: Auth SUCCESS — update everything
        console.log(`[Auth] Device authenticated: ${macAddress}`);

        // a. Update MongoDB
        await Device.findOneAndUpdate(
          { macAddress },
          {
            status: "online",
            lastSeen: new Date(),
            ipAddress: socket.handshake.address,
          }
        );

        // b. Cache auth in Redis (4hr TTL)
        const redisAuthKey = `device:${macAddress}:auth`;
        await redis.hset(redisAuthKey, {
          hashedId: deviceData.hashedId,
          sharedSecret: secretToUse,
        });
        await redis.expire(redisAuthKey, 60 * 60 * 4);

        // c. Cache Kyber session key (24hr TTL)
        const macHash = hashMacAddress(macAddress);
        await redis.set(`device:${macAddress}:session`, sharedSecretHex, "EX", 86400);

        // d. Update device status in Redis
        await redis.hset(`device:${macHash}:status`, {
          online: "true",
          lastSeen: Date.now().toString(),
          socketId: socket.id,
          rawMac: macAddress,
        });
        await redis.expire(`device:${macHash}:status`, 86400);

        // e. Store socket-to-device mapping
        await redis.set(`socket:device:${macAddress}`, socket.id, "EX", 86400);
        await redis.set(`session:key:${macHash}`, sharedSecretHex, "EX", 86400);

        // f. Attach to socket
        socket.isAuthenticated = true;
        socket.sharedSecret = sharedSecretHex;

        // g. Join org room
        const orgId = deviceData.organizationId?.toString();
        if (orgId) {
          socket.join(`org:${orgId}`);
        }

        // h. Emit success
        socket.emit("auth:success", {
          deviceId: deviceData._id,
          orgId,
          token: "session-active",
        });

        // i. Notify frontend
        frontendNamespace.emit("device:update", {
          macAddress,
          status: "online",
          lastSeen: Date.now(),
        });

        // j. Emit topology to org room
        if (orgId) {
          const topology = await getTopologyForOrg(orgId);
          io.of("/frontend").to(`org:${orgId}`).emit("topology:update", { devices: topology });
        }

        // Clean up auth state from socket
        socket.kyberSK = null;
        socket.nonce = null;
      } catch (err) {
        console.error("[Auth] Error during auth:response:", err);
        socket.emit("auth:failed", { reason: "Internal error" });
      }
    });

    // ── pulse (heartbeat every 5 seconds) ──
    socket.on("pulse", async (encryptedPayload) => {
      if (!socket.isAuthenticated || !socket.sharedSecret) return;

      try {
        // Decrypt the AES-256-GCM payload
        let payload = encryptedPayload;
        if (typeof encryptedPayload === "string") {
          try {
            payload = JSON.parse(encryptedPayload);
          } catch {
            return;
          }
        }

        const decryptedJson = decryptMessage(payload, socket.sharedSecret);
        if (!decryptedJson) return;

        let pulseData;
        try {
          pulseData = JSON.parse(decryptedJson);
        } catch {
          pulseData = {};
        }

        const macAddress = socket.macAddress;
        const macHash = hashMacAddress(macAddress);

        // Update MongoDB
        const updateFields = {
          status: "online",
          lastSeen: new Date(),
        };

        // If pulse includes rssi, ip, etc. from firmware
        if (pulseData.rssi !== undefined) updateFields.rssi = pulseData.rssi;
        if (pulseData.ip) updateFields.ipAddress = pulseData.ip;

        await Device.findOneAndUpdate({ macAddress }, updateFields);

        // Update Redis heartbeat (30s TTL — if no pulse in 30s, device is stale)
        await redis.set(`device:${macAddress}:heartbeat`, Date.now().toString(), "EX", 30);

        // Update Redis status
        await redis.hset(`device:${macHash}:status`, "lastSeen", Date.now().toString());

        // Emit topology update to org room
        const orgId = socket.deviceData?.organizationId?.toString();
        if (orgId) {
          const topology = await getTopologyForOrg(orgId);
          io.of("/frontend").to(`org:${orgId}`).emit("topology:update", { devices: topology });
        }

        // Also emit general update for frontend
        frontendNamespace.emit("device:update", {
          macAddress,
          status: "online",
          lastSeen: Date.now(),
        });
      } catch (e) {
        console.error("[Pulse] Error:", e);
      }
    });

    // ── disconnect ─────────────────────────
    socket.on("disconnect", async () => {
      console.log(`[Device] Disconnected: ${socket.id}`);

      if (socket.isAuthenticated && socket.macAddress) {
        const macAddress = socket.macAddress;
        const macHash = hashMacAddress(macAddress);

        try {
          // Update MongoDB
          await Device.findOneAndUpdate(
            { macAddress },
            { status: "offline", lastSeen: new Date() }
          );

          // Clean up Redis
          await redis.del(`socket:device:${macAddress}`);
          await redis.del(`session:key:${macHash}`);
          await redis.del(`device:${macAddress}:heartbeat`);
          await redis.del(`device:${macAddress}:session`);
          await redis.hset(`device:${macHash}:status`, "online", "false");

          // Notify frontend
          frontendNamespace.emit("device:update", {
            macAddress,
            status: "offline",
            lastSeen: Date.now(),
          });

          // Emit topology update to org room
          const orgId = socket.deviceData?.organizationId?.toString();
          if (orgId) {
            const topology = await getTopologyForOrg(orgId);
            io.of("/frontend").to(`org:${orgId}`).emit("topology:update", { devices: topology });
          }
        } catch (err) {
          console.error("[Disconnect] Cleanup error:", err);
        }
      }
    });
  });

  // ──────────────────────────────────────────
  // FRONTEND NAMESPACE
  // ──────────────────────────────────────────

  frontendNamespace.on("connection", (socket) => {
    console.log(`[Frontend] Connected: ${socket.id}`);

    socket.on("frontend:init", async () => {
      try {
        const keys = await redis.keys("device:*:status");
        if (keys.length > 0) {
          const devices = [];
          for (const key of keys) {
            const statusData = await redis.hgetall(key);
            if (statusData && statusData.rawMac) {
              devices.push({
                id: statusData.rawMac,
                macAddress: statusData.rawMac,
                status: statusData.online === "true" ? "online" : "offline",
                lastSeen: parseInt(statusData.lastSeen) || Date.now(),
                ...statusData,
              });
            }
          }
          socket.emit("device:list", devices);
        } else {
          socket.emit("device:list", []);
        }
      } catch (err) {
        console.error("Error fetching initial device list:", err);
      }
    });

    // Join an org room for targeted topology updates
    socket.on("frontend:join-org", (orgId) => {
      if (orgId) {
        socket.join(`org:${orgId}`);
        console.log(`[Frontend] ${socket.id} joined org room: ${orgId}`);
      }
    });

    // Frontend sending message to Device
    socket.on("frontend:send_message", async ({ targetMac, message }) => {
      console.log(`[Frontend] Message Request: "${message}" to ${targetMac}`);

      const sendToDevice = async (mac, msg) => {
        const socketId = await redis.get(`socket:device:${mac}`);
        if (!socketId) return { success: false, reason: "offline" };

        const macHash = hashMacAddress(mac);
        const sessionKey = await redis.get(`session:key:${macHash}`);

        if (!sessionKey) return { success: false, reason: "no-secure-session" };

        // Encrypt and Send
        const encrypted = encryptMessage(msg, sessionKey);
        if (encrypted) {
          const targetSocket = deviceNamespace.sockets.get(socketId);
          if (targetSocket) {
            targetSocket.emit("message", encrypted);
            return { success: true };
          }
        }
        return { success: false, reason: "send-failed" };
      };

      if (targetMac === "BROADCAST") {
        // Broadcast logic if needed
      } else {
        const result = await sendToDevice(targetMac, message);
        socket.emit("message:status", { target: targetMac, ...result });
      }
    });
  });

  return io;
};

// ──────────────────────────────────────────────
// Exported helpers
// ──────────────────────────────────────────────

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

export const emitDeviceUpdate = (data) => {
  if (!io) {
    console.warn("Socket.io not initialized, skipping device update emit");
    return;
  }
  io.of("/frontend").emit("device:update", data);
};
