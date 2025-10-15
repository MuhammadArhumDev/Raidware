import crypto from "crypto";
import redis from "../config/redis.js";
import { emitDeviceUpdate } from "./socket.service.js";

/**
 * Register a new device by storing its public key.
 * @param {string} deviceId
 * @param {string} publicKeyPem
 */
export const registerDevice = async (deviceId, publicKeyPem) => {
  // Store public key
  await redis.set(`device:${deviceId}:pubkey`, publicKeyPem);

  // Initialize meta if not exists
  const exists = await redis.exists(`device:${deviceId}:meta`);
  if (!exists) {
    await redis.hset(`device:${deviceId}:meta`, {
      id: deviceId,
      status: "offline",
      registeredAt: Date.now(),
    });
  }

  return { success: true, message: "Device registered" };
};

/**
 * Authenticate device using ECC Challenge-Response.
 * Verifies signature of: nonce + "|" + deviceId + "|" + timestamp
 * @param {string} deviceId
 * @param {string} timestamp
 * @param {string} nonce
 * @param {string} signatureBase64
 */
export const authenticateDevice = async (
  deviceId,
  timestamp,
  nonce,
  signatureBase64
) => {
  // 1. Check timestamp freshness (e.g., within 5 minutes)
  const now = Date.now();
  if (Math.abs(now - parseInt(timestamp)) > 5 * 60 * 1000) {
    throw new Error("Timestamp expired");
  }

  // 2. Check nonce reuse
  const nonceKey = `auth:nonce:${deviceId}:${nonce}`;
  const nonceUsed = await redis.get(nonceKey);
  if (nonceUsed) {
    throw new Error("Nonce already used");
  }

  // 3. Get Public Key
  const pubKey = await redis.get(`device:${deviceId}:pubkey`);
  if (!pubKey) {
    throw new Error("Device not registered");
  }

  // 4. Verify Signature
  // Data format must match what device signs: nonce|deviceId|timestamp
  const dataToVerify = `${nonce}|${deviceId}|${timestamp}`;

  const verifier = crypto.createVerify("SHA256");
  verifier.update(dataToVerify);
  verifier.end();

  const isValid = verifier.verify(
    pubKey,
    Buffer.from(signatureBase64, "base64")
  );

  if (!isValid) {
    // Log failed attempt for IDS
    await redis.incr(`failed_auth:${deviceId}`);
    throw new Error("Invalid signature");
  }

  // 5. Success: Mark nonce used, reset failed count, update status
  await redis.setex(nonceKey, 300, "used"); // 5 min TTL
  await redis.del(`failed_auth:${deviceId}`);

  await redis.hset(`device:${deviceId}:meta`, {
    status: "online",
    lastSeen: Date.now(),
    ip: "unknown", // In a real req, extract from request
  });

  await redis.sadd("online_devices", deviceId);

  // Emit update
  emitDeviceUpdate({ event: "device_connected", deviceId });

  return { success: true, token: "session_token_placeholder" };
};

/**
 * Update device heartbeat/status
 */
export const updateHeartbeat = async (deviceId, payload) => {
  const isOnline = await redis.sismember("online_devices", deviceId);
  if (!isOnline) {
    // Optional: require re-auth if not online
    // For now, just re-add
    await redis.sadd("online_devices", deviceId);
  }

  await redis.hset(`device:${deviceId}:meta`, {
    lastSeen: Date.now(),
    ...payload,
  });

  emitDeviceUpdate({ event: "heartbeat", deviceId, data: payload });
};

/**
 * Get all devices and their status
 */
export const getAllDevices = async () => {
  const keys = await redis.keys("device:*:meta");
  const devices = [];

  for (const key of keys) {
    const meta = await redis.hgetall(key);
    devices.push(meta);
  }

  return devices;
};
