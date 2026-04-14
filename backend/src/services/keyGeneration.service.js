import crypto from 'crypto';
import jwt from 'jsonwebtoken';

/**
 * Generate Server Key Pair (RSA or Ed25519)
 * Returns: { privateKey, publicKey } both as PEM strings
 */
export function generateServerKeyPair() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
    privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
    publicKeyEncoding: { format: 'pem', type: 'spki' }
  });
  return { privateKey, publicKey };
}

/**
 * Generate Shared Secret (64-char hex string for HMAC key)
 * This is the pre-shared key between server and device
 */
export function generateSharedSecret() {
  return crypto.randomBytes(32).toString('hex'); // 64 hex chars
}

/**
 * Generate Device ID (UUID v4)
 */
export function generateDeviceId() {
  return crypto.randomUUID();
}

/**
 * Generate Hashed ID (SHA256 hash of deviceId)
 */
export function generateHashedId(deviceId) {
  return crypto.createHash('sha256').update(deviceId).digest('hex');
}

/**
 * Generate HMAC Signature
 * Used by device during auth to sign timestamp + deviceId
 */
export function generateHmacSignature(sharedSecret, message) {
  return crypto
    .createHmac('sha256', Buffer.from(sharedSecret, 'hex'))
    .update(message)
    .digest('hex');
}

/**
 * Verify HMAC Signature
 * Server side: validate that device knows the shared secret
 */
export function verifyHmacSignature(sharedSecret, message, signature) {
  const expected = generateHmacSignature(sharedSecret, message);
  // Use timingSafeEqual to prevent timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

/**
 * Generate Provisioning Token (temporary token for device setup)
 * Expires in 24 hours
 */
export function generateProvisioningToken() {
  return {
    token: crypto.randomBytes(32).toString('hex'),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  };
}

/**
 * Create JWT for authenticated device sessions
 * Used after HMAC validation passes
 */
export function createDeviceJWT(deviceId, serverPrivateKey, expiresIn = '7d') {
  const payload = { deviceId, type: 'device' };
  // jsonwebtoken does not support EdDSA. Using HS256 with global secret ensures compatibility with auth.middleware.js
  const secret = process.env.JWT_ACCESS_SECRET || 'VeryStrongJwtSecretForRaidware';
  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn
  });
}

/**
 * Verify Device JWT
 */
export function verifyDeviceJWT(token, serverPublicKey) {
  try {
    const secret = process.env.JWT_ACCESS_SECRET || 'VeryStrongJwtSecretForRaidware';
    return jwt.verify(token, secret, { algorithms: ['HS256'] });
  } catch (error) {
    return null;
  }
}
