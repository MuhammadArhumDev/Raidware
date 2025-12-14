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
    };

    socket.on("auth:init", async ({ macAddress }) => {
      console.log(`[Device] Auth Init from ${macAddress}`);

      const macHash = hashMacAddress(macAddress);
      authState.macAddress = macAddress;

      const nonce = generateNonce();
      authState.nonce = nonce;

      await redis.set(`auth:nonce:${macHash}`, nonce, "EX", 30);

      const { pk, sk } = Kyber768.keyPair();

      const skHex = Buffer.from(sk).toString("hex");
      const pkHex = Buffer.from(pk).toString("hex");

      await redis.set(`auth:kyber:${macHash}`, skHex, "EX", 30);

      socket.emit("auth:challenge", { nonce, pk: pkHex });
    });

    socket.on("auth:response", async ({ signature, ciphertext }) => {
      const { macAddress, nonce } = authState;

      if (!macAddress || !nonce) {
        return socket.emit("auth:failed", { reason: "No auth session init" });
      }

      const authData = await redis.hgetall(`device:${macAddress}:auth`);

      if (!authData || !authData.sharedSecret) {
        console.warn(
          `[Device] Unknown device or keys not synced: ${macAddress}`
        );
        return socket.emit("auth:failed", { reason: "Unknown device" });
      }

      const payload = nonce + macAddress;
      const isValid = verifySignature(
        payload,
        signature,
        authData.sharedSecret
      );

      let sharedSecretHex = null;
      try {
        const skHex = await redis.get(`auth:kyber:${macAddress}`);
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

        socket.emit("auth:success", { token: "session-token-placeholder" });
      } else {
        console.warn(`[Device] Auth Failed: ${macAddress}`);
        socket.emit("auth:failed", {
          reason: "Invalid signature or kyber failure",
        });
        socket.disconnect();
      }
    });

    socket.on("pulse", async (encryptedPayload) => {
      if (!authState.isAuthenticated || !authState.sharedSecret) return;

      try {
        let payload = encryptedPayload;
        if (typeof encryptedPayload === "string") {
          try {
            payload = JSON.parse(encryptedPayload);
          } catch (e) {}
        }

        const decryptedJson = decryptMessage(payload, authState.sharedSecret);
        if (!decryptedJson) {
          console.warn(`[Pulse] Decrypt failed from ${authState.macAddress}`);
          return;
        }

        const macHash = hashMacAddress(authState.macAddress);
        await redis.hset(`device:${macHash}:status`, "lastSeen", Date.now());
      } catch (e) {
        console.error("[Pulse] Error:", e);
      }
    });

    socket.on("disconnect", async () => {
      console.log(`[Device] Disconnect: ${socket.id}`);
      if (authState.isAuthenticated && authState.macAddress) {
        const macHash = hashMacAddress(authState.macAddress);
        await redis.hset(`device:${macHash}:status`, "online", false);
        frontendNamespace.emit("device:update", {
          macAddress: authState.macAddress,
          status: "offline",
          lastSeen: Date.now(),
        });
      }
    });
  });

  // Handle frontend connection and updates
  frontendNamespace.on("connection", (socket) => {
    console.log(`[Frontend] Connected: ${socket.id}`);

    socket.on("frontend:init", async () => {
      console.log(`[Frontend] Init request from: ${socket.id}`);
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
