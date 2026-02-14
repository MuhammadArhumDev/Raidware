import crypto from "crypto";
import Device from "../models/Device.js";
import redis from "../config/redis.js";

const PEPPER = process.env.DEVICE_ID_PEPPER || "super-secret-pepper-string";

// ──────────────────────────────────────────────
// EXISTING FUNCTIONS (used by socket auth flow)
// ──────────────────────────────────────────────

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

// ──────────────────────────────────────────────
// NEW FUNCTIONS — Redis Device Auth Hash Cache
// ──────────────────────────────────────────────

/**
 * Normalize a MAC address to uppercase hex-only string and SHA-256 hash it.
 * @param {string} macAddress - e.g. "AA:BB:CC:DD:EE:FF"
 * @returns {string} SHA-256 hex hash of the normalized MAC
 */
export const hashMAC = (macAddress) => {
  // Normalize: uppercase, strip all non-hex characters (colons, dashes, etc.)
  const normalized = macAddress.toUpperCase().replace(/[^0-9A-F]/g, "");
  return crypto.createHash("sha256").update(normalized).digest("hex");
};

/**
 * Cache a device's auth hash in Redis after successful mTLS authentication.
 * @param {string} macAddress - Device MAC address
 * @param {string} deviceId - Device identifier
 * @param {number} ttlSeconds - Time-to-live in seconds (default: 24 hours)
 * @returns {string} The computed hash
 */
export const cacheDeviceAuth = async (macAddress, deviceId, ttlSeconds = 86400) => {
  const hash = hashMAC(macAddress);
  const key = `device:auth:${hash}`;

  const payload = JSON.stringify({
    deviceId,
    macAddress,
    authenticatedAt: new Date().toISOString(),
    hash,
  });

  await redis.set(key, payload, "EX", ttlSeconds);
  console.log(`[DeviceAuth] Cached auth for ${macAddress} -> ${key} (TTL: ${ttlSeconds}s)`);
  return hash;
};

/**
 * Check if a device's auth hash exists in Redis (trusted device check).
 * @param {string} macAddress - Device MAC address
 * @returns {Object} { authenticated: true, ...data } or { authenticated: false }
 */
export const checkDeviceAuth = async (macAddress) => {
  const hash = hashMAC(macAddress);
  const key = `device:auth:${hash}`;

  const data = await redis.get(key);

  if (data) {
    const parsed = JSON.parse(data);
    return { authenticated: true, ...parsed };
  }

  return { authenticated: false };
};

/**
 * Revoke a device's auth hash from Redis (instant lockout).
 * @param {string} macAddress - Device MAC address
 * @returns {Object} { revoked: true, hash }
 */
export const revokeDeviceAuth = async (macAddress) => {
  const hash = hashMAC(macAddress);
  const key = `device:auth:${hash}`;

  await redis.del(key);
  console.log(`[DeviceAuth] Revoked auth for ${macAddress} -> ${key}`);
  return { revoked: true, hash };
};

/**
 * Get the SHA-256 auth hash for a MAC address without any Redis operations.
 * @param {string} macAddress - Device MAC address
 * @returns {string} The computed hash
 */
export const getAuthHash = (macAddress) => {
  return hashMAC(macAddress);
};
