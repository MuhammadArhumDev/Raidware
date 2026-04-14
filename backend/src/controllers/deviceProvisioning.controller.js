import Device from '../models/Device.js';
import {
  generateServerKeyPair,
  generateSharedSecret,
  generateDeviceId,
  generateHashedId,
  generateProvisioningToken,
  verifyHmacSignature,
  createDeviceJWT,
  verifyDeviceJWT
} from '../services/keyGeneration.service.js';
import { saveAndAnalyzeLog } from '../services/networkLog.service.js';
import { emitDeviceUpdate } from '../services/socket.service.js';

/**
 * POST /api/device-provisioning/generate-keys/:orgId
 * 
 * Generates server key pair + shared secret for device setup
 * Admin calls this once per device they want to add
 * Returns data to be copied and flashed to device
 */
export async function generateDeviceKeys(req, res) {
  try {
    const { orgId } = req.params;
    const { macAddress, deviceName } = req.body;

    if (!macAddress) {
      return res.status(400).json({ success: false, error: 'macAddress is required' });
    }

    // Check if device already exists
    let device = await Device.findOne({ macAddress, organizationId: orgId });
    if (device && device.provisioned) {
      return res.status(409).json({
        success: false,
        error: 'Device already provisioned. Use revoke endpoint first to reprovision.'
      });
    }

    // Generate cryptographic material
    const { privateKey: serverPrivateKey, publicKey: serverPublicKey } = generateServerKeyPair();
    const deviceId = generateDeviceId();
    const sharedSecret = generateSharedSecret();
    const hashedId = generateHashedId(deviceId);
    const { token: provisioningToken, expiresAt: provisioningTokenExpiry } = generateProvisioningToken();

    if (device) {
      // Update existing unprovision device
      device.deviceId = deviceId;
      device.sharedSecret = sharedSecret;
      device.hashedId = hashedId;
      device.serverPublicKey = serverPublicKey;
      device.serverPrivateKey = serverPrivateKey;
      device.provisioningToken = provisioningToken;
      device.provisioningTokenExpiry = provisioningTokenExpiry;
      device.provisioned = false;
      device.status = 'pending';
      await device.save();
    } else {
      // Create new device
      device = new Device({
        macAddress,
        organizationId: orgId,
        name: deviceName || `Device_${macAddress.slice(-6)}`,
        deviceId,
        sharedSecret,
        hashedId,
        serverPublicKey,
        serverPrivateKey,
        provisioningToken,
        provisioningTokenExpiry,
        status: 'pending',
        provisioned: false
      });
      await device.save();
    }

    // Return provisioning data (DO NOT expose serverPrivateKey to client)
    return res.status(200).json({
      success: true,
      provisioning: {
        deviceId,
        sharedSecret,
        serverPublicKey,
        macAddress,
        deviceName: device.name,
        connectionType: 'direct',
        // Instructions for user
        instructions: {
          step1: 'Copy the deviceId, sharedSecret, and serverPublicKey below',
          step2: 'Flash these values to your IoT device via its configuration interface',
          step3: 'Device will connect directly to the server without needing a mesh parent',
          step4: 'Status will show "online" in dashboard when authenticated (within 30 seconds)',
          security: 'HMAC-SHA256 authentication is automatic — device signs its timestamp with shared secret'
        }
      }
    });
  } catch (error) {
    console.error('generateDeviceKeys error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/device-provisioning/authenticate
 * 
 * Device calls this during connection with HMAC-signed message
 * Returns JWT token for subsequent authenticated requests
 */
export async function authenticateDevice(req, res) {
  try {
    const { deviceId, macAddress, timestamp, signature } = req.body;

    if (!deviceId || !macAddress || !timestamp || !signature) {
      return res.status(400).json({
        success: false,
        error: 'deviceId, macAddress, timestamp, and signature are required'
      });
    }

    // Find device by deviceId
    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({
        success: false,
        error: 'Device not found. Provision device first.'
      });
    }

    if (!device.sharedSecret) {
      return res.status(400).json({
        success: false,
        error: 'Device not provisioned. Missing shared secret.'
      });
    }

    // Validate HMAC signature: device must sign "deviceId|timestamp"
    const message = `${deviceId}|${timestamp}`;
    const isValid = verifyHmacSignature(device.sharedSecret, message, signature);

    if (!isValid) {
      return res.status(403).json({
        success: false,
        error: 'HMAC signature validation failed. Shared secret mismatch.'
      });
    }

    // Check if provisioning token has expired (optional: enforce provisioning token first)
    if (device.provisioningTokenExpiry && new Date() > device.provisioningTokenExpiry) {
      return res.status(403).json({
        success: false,
        error: 'Provisioning token expired. Request new keys from dashboard.'
      });
    }

    // Create JWT token for device session
    const token = createDeviceJWT(deviceId, device.serverPrivateKey);

    // Update device status for direct connection (no mesh parent needed)
    device.provisioned = true;
    device.status = 'online';
    device.connectionType = 'direct';
    device.lastSeen = new Date();
    device.ipAddress = req.ip || req.connection.remoteAddress;
    if (device.macAddress !== macAddress) {
      device.macAddress = macAddress;
    }
    await device.save();

    return res.status(200).json({
      success: true,
      token,
      connectionType: 'direct',
      expiresIn: '7d'
    });
  } catch (error) {
    console.error('authenticateDevice error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * GET /api/device-provisioning/copy-secrets/:orgId/:macAddress
 * 
 * Allows admin to retrieve provisioning data again (e.g., if they didn't copy it)
 * Only returns data if device not yet provisioned
 */
export async function getCopyableSecrets(req, res) {
  try {
    const { orgId, macAddress } = req.params;

    const device = await Device.findOne({ macAddress, organizationId: orgId });
    if (!device) {
      return res.status(404).json({ success: false, error: 'Device not found' });
    }

    if (!device.sharedSecret || !device.deviceId) {
      return res.status(400).json({
        success: false,
        error: 'Device has no provisioning data. Generate keys first.'
      });
    }

    if (device.provisioned) {
      return res.status(400).json({
        success: false,
        error: 'Device already provisioned. Cannot re-expose secrets.'
      });
    }

    return res.status(200).json({
      success: true,
      secrets: {
        deviceId: device.deviceId,
        sharedSecret: device.sharedSecret,
        serverPublicKey: device.serverPublicKey,
        macAddress: device.macAddress
      }
    });
  } catch (error) {
    console.error('getCopyableSecrets error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/device-provisioning/verify-server-signature
 * 
 * Optional: Device can verify server's JWT signature using SERVER_PUBLIC_KEY
 * This enables mutual authentication (server proves it knows the private key)
 */
export async function verifyServerSignature(req, res) {
  try {
    const { deviceId, token } = req.body;

    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({ success: false, error: 'Device not found' });
    }

    const decoded = verifyDeviceJWT(token, device.serverPublicKey);
    if (!decoded) {
      return res.status(403).json({
        success: false,
        error: 'Invalid server signature'
      });
    }

    return res.status(200).json({
      success: true,
      verified: true,
      decoded
    });
  } catch (error) {
    console.error('verifyServerSignature error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/device-provisioning/heartbeat
 * 
 * Device sends periodic heartbeat with status, RSSI, IP, etc.
 * Updates device record and broadcasts topology update
 */
export async function deviceHeartbeat(req, res) {
  try {
    const { deviceId, macAddress, status, rssi, ipAddress, freeHeap, uptime } = req.body;

    if (!deviceId) {
      return res.status(400).json({ success: false, error: 'deviceId is required' });
    }

    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({ success: false, error: 'Device not found' });
    }

    // Update device fields
    device.status = status || 'online';
    device.lastSeen = new Date();
    device.rssi = rssi || device.rssi;
    device.ipAddress = ipAddress || device.ipAddress;
    if (macAddress && device.macAddress !== macAddress) {
      device.macAddress = macAddress;
    }
    // Store extra data in metadata
    if (freeHeap) device.metadata.set('freeHeap', String(freeHeap));
    if (uptime) device.metadata.set('uptime', String(uptime));

    await device.save();

    // Broadcast topology update to org dashboard
    if (device.organizationId) {
      const devices = await Device.find({ organizationId: device.organizationId });
      const topology = devices.map(d => ({
        id: d._id,
        mac: d.macAddress,
        name: d.name,
        status: d.status,
        lastSeen: d.lastSeen,
        connectionType: d.connectionType,
        rssi: d.rssi,
        ipAddress: d.ipAddress,
        authenticated: d.provisioned
      }));
      emitDeviceUpdate('topology:update', { devices: topology });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('deviceHeartbeat error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * POST /api/device-provisioning/network-log
 * 
 * Device sends network connection data for IDS analysis
 */
export async function deviceNetworkLog(req, res) {
  try {
    const { deviceId, macAddress, srcIp, dstIp, protocol, srcPort, dstPort, packetCount, byteCount, features } = req.body;

    if (!deviceId) {
      return res.status(400).json({ success: false, error: 'deviceId is required' });
    }

    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({ success: false, error: 'Device not found' });
    }

    const logData = {
      orgId: device.organizationId?.toString() || '',
      macAddress: macAddress || device.macAddress,
      deviceName: device.name || 'Unknown Device',
      srcIp: srcIp || '0.0.0.0',
      dstIp: dstIp || '0.0.0.0',
      protocol: protocol || 'TCP',
      srcPort: srcPort || 0,
      dstPort: dstPort || 0,
      flowDuration: 0,
      packetCount: packetCount || 0,
      byteCount: byteCount || 0,
      features: Array.isArray(features) ? features : []
    };

    const savedLog = await saveAndAnalyzeLog(logData);

    if (savedLog && device.organizationId) {
      // Broadcast log to org dashboard
      emitDeviceUpdate('network:log:new', {
        log: {
          id: savedLog._id,
          macAddress: savedLog.macAddress,
          deviceName: savedLog.deviceName,
          srcIp: savedLog.srcIp,
          dstIp: savedLog.dstIp,
          protocol: savedLog.protocol,
          srcPort: savedLog.srcPort,
          dstPort: savedLog.dstPort,
          prediction: savedLog.prediction,
          confidence: savedLog.confidence,
          action: savedLog.action,
          timestamp: savedLog.timestamp
        }
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('deviceNetworkLog error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
