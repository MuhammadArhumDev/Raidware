import { Server } from "socket.io";
import redis from "../config/redis.js";
import { generateNonce, verifySignature } from "./deviceAuth.service.js";
import pkg from "crystals-kyber";
const { Kyber768 } = pkg;
import crypto from "crypto";

// Decrypt AES-256-GCM message
const decryptMessage = (encryptedObj, sharedSecretHex) => {
  try {
    const key = Buffer.from(sharedSecretHex, "hex");
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

// Encrypt message with AES-256-GCM
const encryptMessage = (plaintext, sharedSecretHex) => {
  try {
    const key = Buffer.from(sharedSecretHex, "hex");
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

let io;

// Initialize Socket.IO server
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

  // Handle device connections and authentication
  deviceNamespace.on("connection", (socket) => {
    console.log(`[Device] Connected: ${socket.id}`);

    let authState = {
      isAuthenticated: false,
      macAddress: null,
      nonce: null,
      sharedSecret: null,
    };

    socket.on("auth:init", async ({ macAddress }) => {
      console.log(`[Device] Auth Init from ${macAddress}`);

      const macHash = hashMacAddress(macAddress);
      authState.macAddress = macAddress;

      // Check validation whitelist (MAC Hash)
      const isKnown = await redis.get(`auth:whitelist:${macHash}`);
      if (isKnown) {
        console.log(`[Auth] Device ${macAddress} found in whitelist.`);
      } else {
        console.log(
          `[Auth] Device ${macAddress} NOT in whitelist. Proceeding with full auth.`
        );
      }

      const nonce = generateNonce();
      authState.nonce = nonce;

      await redis.set(`auth:nonce:${macHash}`, nonce, "EX", 30);

      try {
        const { pk, sk } = Kyber768.keyPair(); // Ensure crystals-kyber is working

        const skHex = Buffer.from(sk).toString("hex");
        const pkHex = Buffer.from(pk).toString("hex");

        await redis.set(`auth:kyber:${macHash}`, skHex, "EX", 60);

        socket.emit("auth:challenge", { nonce, pk: pkHex });
      } catch (e) {
        console.error("Kyber Error:", e);
        socket.emit("auth:failed", { reason: "Internal encryption error" });
      }
    });

    socket.on("auth:response", async ({ signature, ciphertext }) => {
      const { macAddress, nonce } = authState;

      if (!macAddress || !nonce) {
        return socket.emit("auth:failed", { reason: "No auth session init" });
      }

      const authData = await redis.hgetall(`device:${macAddress}:auth`);

      let secretToUse = authData?.sharedSecret;

      // Fallback to Global Org Key if no individual key found
      if (!secretToUse) {
        const globalSecret = await redis.get("org:default_secret");
        if (globalSecret) {
          console.log(`[Auth] Using Global Organization Key for ${macAddress}`);
          secretToUse = globalSecret;
        }
      }

      if (!secretToUse) {
        console.warn(
          `[Device] Unknown device or keys not synced: ${macAddress}`
        );
        return socket.emit("auth:failed", { reason: "Unknown device" });
      }

      const payload = nonce + macAddress;
      const isValid = verifySignature(payload, signature, secretToUse);

      let sharedSecretHex = null;
      try {
        const macHash = hashMacAddress(macAddress);
        const skHex = await redis.get(`auth:kyber:${macHash}`);

        if (skHex && ciphertext) {
          const sk = new Uint8Array(Buffer.from(skHex, "hex"));
          const ct = new Uint8Array(Buffer.from(ciphertext, "hex"));
          const ss = Kyber768.decapsulate(ct, sk);
          sharedSecretHex = Buffer.from(ss).toString("hex");
          console.log(
            `[Kyber] Shared Secret Established: ${sharedSecretHex.substring(
              0,
              10
            )}...`
          );
        } else {
          console.warn("[Kyber] Missing Secret Key or Ciphertext");
        }
      } catch (err) {
        console.error("[Kyber] Decapsulation Failed:", err);
      }

      if (isValid && sharedSecretHex) {
        console.log(`[Device] Authenticated: ${macAddress}`);
        authState.isAuthenticated = true;
        authState.sharedSecret = sharedSecretHex;

        const macHash = hashMacAddress(macAddress);

        // Cache MAC Hash in Redis (Whitelist)
        await redis.set(`auth:whitelist:${macHash}`, "true");

        // Map Socket ID and Session Key for backend-initiated messaging
        await redis.set(`socket:device:${macAddress}`, socket.id);
        await redis.set(
          `session:key:${macHash}`,
          sharedSecretHex,
          "EX",
          3600 * 24
        ); // 24 hours

        await redis.hset(`device:${macHash}:status`, {
          online: true,
          lastSeen: Date.now(),
          socketId: socket.id,
          rawMac: macAddress,
        });

        frontendNamespace.emit("device:update", {
          macAddress,
          status: "online",
          lastSeen: Date.now(),
        });

        socket.emit("auth:success", { token: "session-active" });
      } else {
        console.warn(`[Device] Auth Failed: ${macAddress}`);
        socket.emit("auth:failed", {
          reason: "Invalid signature or kyber failure",
        });
        socket.disconnect();
      }
    });

    socket.on("pulse", async (encryptedPayload) => {
      // Pulse handling
      if (!authState.isAuthenticated || !authState.sharedSecret) return;
      try {
        let payload = encryptedPayload;
        if (
          typeof encryptedPayload === "string" &&
          !encryptedPayload.startsWith("{")
        ) {
          // raw string?
        } else if (typeof encryptedPayload !== "string") {
          payload = encryptedPayload;
        }

        const decryptedJson = decryptMessage(payload, authState.sharedSecret);
        if (decryptedJson) {
          const macHash = hashMacAddress(authState.macAddress);
          await redis.hset(`device:${macHash}:status`, "lastSeen", Date.now());
        }
      } catch (e) {
        console.error("[Pulse] Error:", e);
      }
    });

    socket.on("disconnect", async () => {
      if (authState.isAuthenticated && authState.macAddress) {
        const macHash = hashMacAddress(authState.macAddress);
        await redis.del(`socket:device:${authState.macAddress}`);
        await redis.del(`session:key:${macHash}`); // Clear session key on disconnect? Or keep for resume? Cleaning up is safer.
        await redis.hset(`device:${macHash}:status`, "online", false);

        frontendNamespace.emit("device:update", {
          macAddress: authState.macAddress,
          status: "offline",
          lastSeen: Date.now(),
        });
      }
    });
  });

  // Handle frontend connection
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
          // We need to send this to the specific socket in deviceNamespace
          const targetSocket = deviceNamespace.sockets.get(socketId);
          if (targetSocket) {
            targetSocket.emit("message", encrypted);
            return { success: true };
          }
        }
        return { success: false, reason: "send-failed" };
      };

      if (targetMac === "BROADCAST") {
        // Logic for broadcast if needed
      } else {
        const result = await sendToDevice(targetMac, message);
        socket.emit("message:status", { target: targetMac, ...result });
      }
    });
  });

  return io;
};

// Get IO instance logic
export const getIO = () => {
  if (!io) {
    throw new Error("Socket.io not initialized!");
  }
  return io;
};

// Emit device update helper
export const emitDeviceUpdate = (data) => {
  if (!io) {
    console.warn("Socket.io not initialized, skipping device update emit");
    return;
  }
  io.of("/frontend").emit("device:update", data);
};
