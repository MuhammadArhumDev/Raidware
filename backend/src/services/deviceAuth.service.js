import crypto from "crypto";
import Device from "../models/Device.js";
import redis from "../config/redis.js";

const PEPPER = process.env.DEVICE_ID_PEPPER || "super-secret-pepper-string";

// Hash the raw eFuse ID to compare with stored hashedId
export const hashDeviceID = (eFuseId) => {
  return crypto.createHmac("sha256", PEPPER).update(eFuseId).digest("hex");
};

export const generateNonce = () => {
  return crypto.randomBytes(16).toString("hex");
};

// Verify the signature provided by the device
// Payload usually matches: nonce + macAddress
export const verifySignature = (payload, signature, sharedSecret) => {
  const expectedSignature = crypto
    .createHmac("sha256", sharedSecret)
    .update(payload)
    .digest("hex");

  // Use timingSafeEqual to prevent timing attacks
  const source = Buffer.from(signature, "hex");
  const target = Buffer.from(expectedSignature, "hex");

  if (source.length !== target.length) return false;

  return crypto.timingSafeEqual(source, target);
};

// Sync valid device hashes/secrets from Mongo to Redis
// This allows for fast auth checks without hitting Mongo every handshake
export const syncDeviceHashes = async () => {
  try {
    console.log("[Sync] Starting MongoDB -> Redis device sync...");
    const devices = await Device.find({}, "macAddress hashedId sharedSecret");

    if (devices.length === 0) {
      console.log("[Sync] No devices found in DB.");
      return;
    }

    const pipeline = redis.pipeline();

    devices.forEach((dev) => {
      // Store relevant auth info in a Redis Hash
      // Key: device:{macAddress}:auth
      const key = `device:${dev.macAddress}:auth`;
      pipeline.hset(key, {
        hashedId: dev.hashedId,
        sharedSecret: dev.sharedSecret,
      });
      pipeline.expire(key, 60 * 60 * 4); // Expire after 4 hours (refreshed by next sync)
    });

    await pipeline.exec();
    console.log(`[Sync] Synced ${devices.length} devices to Redis.`);
  } catch (error) {
    console.error("[Sync] Error syncing devices:", error);
  }
};
