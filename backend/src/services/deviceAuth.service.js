import crypto from "crypto";
import redis from "../config/redis.js";
import pkg from "crystals-kyber";
const { Kyber768 } = pkg;

const pendingAuths = new Map();

export const initiateAuth = async (macAddress) => {
  const nonce = crypto.randomBytes(32).toString('hex');
  const { publicKey: pk, secretKey: sk } = Kyber768.keyPair();

  pendingAuths.set(macAddress, {
    nonce,
    sk,
    expiresAt: new Date(Date.now() + 120000)
  });

  return { nonce, pk: Buffer.from(pk).toString('hex') };
};

export const verifyAuthResponse = async (macAddress, signature, ciphertextHex) => {
  const session = pendingAuths.get(macAddress);
  if (!session) return { success: false };

  pendingAuths.delete(macAddress);

  if (session.expiresAt < new Date()) {
    return { success: false };
  }

  const expectedSecret = process.env.DEVICE_SHARED_SECRET || "super-secret-key-123";
  const payload = session.nonce + macAddress;

  const expectedSignature = crypto.createHmac('sha256', expectedSecret)
    .update(payload)
    .digest('hex');

  const source = Buffer.from(signature, 'hex');
  const target = Buffer.from(expectedSignature, 'hex');

  if (source.length !== target.length || !crypto.timingSafeEqual(source, target)) {
    return { success: false };
  }

  try {
    const ciphertextBuf = Buffer.from(ciphertextHex, 'hex');
    const ciphertextArray = new Uint8Array(ciphertextBuf);

    const sharedSecretBytes = Kyber768.decapsulate(ciphertextArray, session.sk);
    const sharedSecretHex = Buffer.from(sharedSecretBytes).toString('hex');

    await redis.set(`device:${macAddress}:sharedSecret`, sharedSecretHex, "EX", 86400);

    return { success: true };
  } catch (err) {
    console.error(`[DeviceAuth] Decapsulation error for ${macAddress}:`, err.message);
    return { success: false };
  }
};

export const decryptPulse = async (macAddress, payload) => {
  const sharedSecretHex = await redis.get(`device:${macAddress}:sharedSecret`);
  if (!sharedSecretHex) {
    console.log(`[DeviceAuth] No shared secret for ${macAddress}`);
    return null;
  }

  try {
    const sharedSecretBuf = Buffer.from(sharedSecretHex, 'hex').subarray(0, 32);
    const ivBuf = Buffer.from(payload.iv, 'hex');
    const tagBuf = Buffer.from(payload.tag, 'hex');
    const dataBuf = Buffer.from(payload.data, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', sharedSecretBuf, ivBuf);
    decipher.setAuthTag(tagBuf);

    let decrypted = decipher.update(dataBuf);
    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return JSON.parse(decrypted.toString('utf8'));
  } catch (err) {
    console.log(`[DeviceAuth] Decrypt failed for ${macAddress}: ${err.message}`);
    return null;
  }
};

const cleanupExpiredSessions = () => {
  let cleaned = 0;
  const now = new Date();
  for (const [mac, session] of pendingAuths.entries()) {
    if (session.expiresAt < now) {
      pendingAuths.delete(mac);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    console.log(`[DeviceAuth] Cleaned up ${cleaned} expired pending sessions`);
  }
};

setInterval(cleanupExpiredSessions, 60000);

export const hashDeviceID = () => {};
export const generateNonce = () => {};
export const verifySignature = () => {};
export const syncDeviceHashes = async () => {};
export const hashMAC = () => {};
export const cacheDeviceAuth = async () => {};
export const checkDeviceAuth = async () => {};
export const revokeDeviceAuth = async () => {};
export const getAuthHash = () => {};
