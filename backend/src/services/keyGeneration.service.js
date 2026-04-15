import crypto from 'crypto';
import jwt from 'jsonwebtoken';

export function generateServerKeyPair() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519', {
    privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
    publicKeyEncoding: { format: 'pem', type: 'spki' }
  });
  return { privateKey, publicKey };
}

export function generateSharedSecret() {
  return crypto.randomBytes(32).toString('hex'); 
}

export function generateDeviceId() {
  return crypto.randomUUID();
}

export function generateHashedId(deviceId) {
  return crypto.createHash('sha256').update(deviceId).digest('hex');
}

export function generateHmacSignature(sharedSecret, message) {
  return crypto
    .createHmac('sha256', Buffer.from(sharedSecret, 'hex'))
    .update(message)
    .digest('hex');
}

export function verifyHmacSignature(sharedSecret, message, signature) {
  const expected = generateHmacSignature(sharedSecret, message);

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    return false;
  }
}

export function generateProvisioningToken() {
  return {
    token: crypto.randomBytes(32).toString('hex'),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) 
  };
}

export function createDeviceJWT(deviceId, serverPrivateKey, expiresIn = '7d') {
  const payload = { deviceId, type: 'device' };

  const secret = process.env.JWT_ACCESS_SECRET || 'VeryStrongJwtSecretForRaidware';
  return jwt.sign(payload, secret, {
    algorithm: 'HS256',
    expiresIn
  });
}

export function verifyDeviceJWT(token, serverPublicKey) {
  try {
    const secret = process.env.JWT_ACCESS_SECRET || 'VeryStrongJwtSecretForRaidware';
    return jwt.verify(token, secret, { algorithms: ['HS256'] });
  } catch (error) {
    return null;
  }
}
