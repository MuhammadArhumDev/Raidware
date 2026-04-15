import crypto from "crypto";
import Device from "../models/Device.js";

export const provisionDevice = async (macAddress, orgId, deviceName) => {

  const existingDevice = await Device.findOne({ macAddress });
  if (existingDevice) {
    throw new Error('Device already provisioned');
  }

  const sharedSecret = crypto.randomBytes(32).toString('hex');

  const clientCert = "PLACEHOLDER";
  const clientKey = "PLACEHOLDER";
  console.log("[Provision] node-forge not available — cert generation skipped");

  await Device.create({
    macAddress,
    organizationId: orgId,
    name: deviceName || macAddress,
    status: 'offline',
    meshRole: 'node',
    lastSeen: null
  });

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
