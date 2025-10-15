import { Server } from "socket.io";
import redis from "../config/redis.js";
import { generateNonce, verifySignature } from "./deviceAuth.service.js";
import pkg from "crystals-kyber";
const { Kyber768 } = pkg;
import crypto from "crypto";

// --- Crypto Helpers ---

// AES-256-GCM Decrypt
const decryptMessage = (encryptedObj, sharedSecretHex) => {
  try {
    const key = Buffer.from(sharedSecretHex, "hex"); // 32 bytes
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

// AES-256-GCM Encrypt
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

// SHA-256 Hash for MAC
const hashMacAddress = (mac) => {
  return crypto.createHash("sha256").update(mac).digest("hex");
};

let io;

export const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: "*", // Allow all for now, lock down in production
      methods: ["GET", "POST"],
    },
  });

  console.log("Socket.IO initialized");

  // Namespace for Devices
  const deviceNamespace = io.of("/devices");

  // Namespace for Frontend
  const frontendNamespace = io.of("/frontend");

  // --- Device Logic ---
  deviceNamespace.on("connection", (socket) => {
    console.log(`[Device] Connected: ${socket.id}`);

    // Auth State Tracker for this socket
    let authState = {
      isAuthenticated: false,
      macAddress: null,
      nonce: null,
    };

    // Step 1: Device initiates (or we trigger it)
    // Device says: "Hello, I am MAC_ADDRESS"
    socket.on("auth:init", async ({ macAddress }) => {
      console.log(`[Device] Auth Init from ${macAddress}`);

      // Hash MAC for Lookup
      const macHash = hashMacAddress(macAddress);
      authState.macAddress = macAddress; // Keep raw for internal ref, but DB uses hash?
      // User said: "Store authenticated MAC hashed".
      // Assuming we verify against a whitelist.
      // For now, let's just proceed with challenge.

      // Generate Nonce
      const nonce = generateNonce();
      authState.nonce = nonce;

      // Store nonce temporarily
      await redis.set(`auth:nonce:${macHash}`, nonce, "EX", 30);

      // --- Kyber KeyGen ---
      // Generate (pk, sk)
      const { pk, sk } = Kyber768.keyPair();

      // Store sk in redis (as byte array or base64) to retrieve it when response comes
      // Convert to Base64/Hex for storage?
      // crystals-kyber usually returns Uint8Array.
      const skHex = Buffer.from(sk).toString("hex");
      const pkHex = Buffer.from(pk).toString("hex");

      await redis.set(`auth:kyber:${macHash}`, skHex, "EX", 30);

      // Send Challenge with Nonce AND Kyber Public Key
      socket.emit("auth:challenge", { nonce, pk: pkHex });
    });

    // Step 2: Device responds with Signature AND Kyber Ciphertext
    socket.on("auth:response", async ({ signature, ciphertext }) => {
      const { macAddress, nonce } = authState;

      if (!macAddress || !nonce) {
        return socket.emit("auth:failed", { reason: "No auth session init" });
      }

      // Fetch Auth Data from Redis (Synced from Mongo)
      const authData = await redis.hgetall(`device:${macAddress}:auth`);

      if (!authData || !authData.sharedSecret) {
        console.warn(
          `[Device] Unknown device or keys not synced: ${macAddress}`
        );
        return socket.emit("auth:failed", { reason: "Unknown device" });
      }

      // Check Signature
      // Payload = nonce + macAddress (Must match Firmware logic)
      const payload = nonce + macAddress;
      const isValid = verifySignature(
        payload,
        signature,
        authData.sharedSecret
      );

      // Kyber Decapsulation
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
        authState.sharedSecret = sharedSecretHex; // Store for encryption

        // Hash MAC
        const macHash = hashMacAddress(macAddress);

        // Update Redis Status using HASHED MAC?
        // User said "Store authenticated MAC addresses (hashed) in Redis".
        // Example: SADD allowed_devices <hash> ?
        // Or just key naming convention?
        // "Redis keys matching device:*:status" in frontend logic suggests we might need to be careful if we change key names.
        // But user asked explicitly for hashing.
        // Let's use Hashed MAC for the session key.

        await redis.hset(`device:${macHash}:status`, {
          online: true,
          lastSeen: Date.now(),
          socketId: socket.id,
          rawMac: macAddress, // Optional: store raw inside value if needed for display
        });

        // Notify Frontend
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

    // Heartbeat
    socket.on("pulse", async (encryptedPayload) => {
      if (!authState.isAuthenticated || !authState.sharedSecret) return;

      try {
        // Decrypt Pulse
        // Expecting encryptedPayload to be JSON object or string with { iv, tag, data }
        // If it comes as a string, parse it.
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

        // const data = JSON.parse(decryptedJson); // If pulse content is JSON

        // Update Redis
        // Use MAC HASH as key?
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

  // --- Frontend Logic ---
  frontendNamespace.on("connection", (socket) => {
    console.log(`[Frontend] Connected: ${socket.id}`);

    // Send initial list of online devices?
    // Could iterate Redis keys matching device:*:status
  });

  return io;
};

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
