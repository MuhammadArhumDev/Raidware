import crypto from "crypto";
import Device from "../models/Device.js";

/**
 * Provision a new device.
 * 
 * Note regarding sharedSecret: 
 * The per-device sharedSecret generated here is what gets flashed into the firmware.
 * However, verifyAuthResponse currently reads process.env.DEVICE_SHARED_SECRET as the HMAC key.
 * This means all devices currently share the same secret (firmware default).
 * We generate and return a unique sharedSecret here as a future upgrade path for per-device secrets.
 */
export const provisionDevice = async (macAddress, orgId, deviceName) => {
  // Step 1: Check for duplicate
  const existingDevice = await Device.findOne({ macAddress });
  if (existingDevice) {
    throw new Error('Device already provisioned');
  }

  // Step 2: Generate device shared secret
  const sharedSecret = crypto.randomBytes(32).toString('hex');

  // Step 3: Generate client certificate (node-forge or fallback)
  // node-forge is not installed, so we return placeholders
  const clientCert = "PLACEHOLDER";
  const clientKey = "PLACEHOLDER";
  console.log("[Provision] node-forge not available — cert generation skipped");

  // Step 4: Register in MongoDB
  await Device.create({
    macAddress,
    organizationId: orgId,
    name: deviceName || macAddress,
    status: 'offline',
    meshRole: 'node',
    lastSeen: null
  });

  // Step 5: Return provisioning bundle
  const secretsHTemplate = `const char* DEVICE_SHARED_SECRET = "${sharedSecret}";
const char* DEVICE_MAC = "${macAddress}";
const char* DEVICE_ORG_ID = "${orgId}";

const char* client_cert = \\
"-----BEGIN CERTIFICATE-----\\n" \\
"${clientCert}\\n" \\
"-----END CERTIFICATE-----\\n";

const char* client_key = \\
"-----BEGIN RSA PRIVATE KEY-----\\n" \\
"${clientKey}\\n" \\
"-----END RSA PRIVATE KEY-----\\n";`;

  console.log(`[Provision] Successfully provisioned device ${macAddress} for org ${orgId}`);

  return {
    macAddress,
    orgId,
    deviceName: deviceName || macAddress,
    sharedSecret,
    clientCert,
    clientKey,
    secretsHTemplate
  };
};
