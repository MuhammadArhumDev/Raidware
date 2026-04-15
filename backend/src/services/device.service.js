import crypto from "crypto";
import redis from "../config/redis.js";
import { emitDeviceUpdate } from "./socket.service.js";

export const registerDevice = async (deviceId, publicKeyPem) => {

  await redis.set(`device:${deviceId}:pubkey`, publicKeyPem);

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

export const authenticateDevice = async (
  deviceId,
  timestamp,
  nonce,
  signatureBase64
) => {

  const now = Date.now();
  if (Math.abs(now - parseInt(timestamp)) > 5 * 60 * 1000) {
    throw new Error("Timestamp expired");
  }

  const nonceKey = `auth:nonce:${deviceId}:${nonce}`;
  const nonceUsed = await redis.get(nonceKey);
  if (nonceUsed) {
    throw new Error("Nonce already used");
  }

  const pubKey = await redis.get(`device:${deviceId}:pubkey`);
  if (!pubKey) {
    throw new Error("Device not registered");
  }

  const dataToVerify = `${nonce}|${deviceId}|${timestamp}`;

  const verifier = crypto.createVerify("SHA256");
  verifier.update(dataToVerify);
  verifier.end();

  const isValid = verifier.verify(
    pubKey,
    Buffer.from(signatureBase64, "base64")
  );

  if (!isValid) {

    await redis.incr(`failed_auth:${deviceId}`);
    throw new Error("Invalid signature");
  }

  await redis.setex(nonceKey, 300, "used"); 
  await redis.del(`failed_auth:${deviceId}`);

  await redis.hset(`device:${deviceId}:meta`, {
    status: "online",
    lastSeen: Date.now(),
    ip: "unknown", 
  });

  await redis.sadd("online_devices", deviceId);

  emitDeviceUpdate({ event: "device_connected", deviceId });

  return { success: true, token: "session_token_placeholder" };
};

export const updateHeartbeat = async (deviceId, payload) => {
  const isOnline = await redis.sismember("online_devices", deviceId);
  if (!isOnline) {

    await redis.sadd("online_devices", deviceId);
  }

  await redis.hset(`device:${deviceId}:meta`, {
    lastSeen: Date.now(),
    ...payload,
  });

  emitDeviceUpdate({ event: "heartbeat", deviceId, data: payload });
};

export const getAllDevices = async () => {
  const keys = await redis.keys("device:*:meta");
  const devices = [];

  for (const key of keys) {
    const meta = await redis.hgetall(key);
    devices.push(meta);
  }

  return devices;
};
