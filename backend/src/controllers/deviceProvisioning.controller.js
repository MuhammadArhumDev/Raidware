import Device from '../models/Device.js';
import redis from '../config/redis.js';
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
import { publishHeartbeat } from '../services/redisPubSub.service.js';

export async function generateDeviceKeys(req, res) {
  try {
    const { orgId } = req.params;
    const { macAddress, deviceName } = req.body;

    if (!macAddress) {
      return res.status(400).json({ success: false, error: 'macAddress is required' });
    }

    let device = await Device.findOne({ macAddress, organizationId: orgId });
    if (device && device.provisioned) {
      return res.status(409).json({
        success: false,
        error: 'Device already provisioned. Use revoke endpoint first to reprovision.'
      });
    }

    const { privateKey: serverPrivateKey, publicKey: serverPublicKey } = generateServerKeyPair();
    const deviceId = generateDeviceId();
    const sharedSecret = generateSharedSecret();
    const hashedId = generateHashedId(deviceId);
    const { token: provisioningToken, expiresAt: provisioningTokenExpiry } = generateProvisioningToken();

    if (device) {

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

    return res.status(200).json({
      success: true,
      provisioning: {
        deviceId,
        sharedSecret,
        serverPublicKey,
        macAddress,
        deviceName: device.name,
        connectionType: 'direct',

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

export async function authenticateDevice(req, res) {
  try {
    const { deviceId, macAddress, timestamp, signature } = req.body;

    if (!deviceId || !macAddress || !timestamp || !signature) {
      return res.status(400).json({
        success: false,
        error: 'deviceId, macAddress, timestamp, and signature are required'
      });
    }

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

    const message = `${deviceId}|${timestamp}`;
    const isValid = verifyHmacSignature(device.sharedSecret, message, signature);

    if (!isValid) {
      return res.status(403).json({
        success: false,
        error: 'HMAC signature validation failed. Shared secret mismatch.'
      });
    }

    if (device.provisioningTokenExpiry && new Date() > device.provisioningTokenExpiry) {
      return res.status(403).json({
        success: false,
        error: 'Provisioning token expired. Request new keys from dashboard.'
      });
    }

    const token = createDeviceJWT(deviceId, device.serverPrivateKey);

    device.provisioned = true;
    device.status = 'online';
    device.connectionType = 'direct';
    device.lastSeen = new Date();
    device.ipAddress = req.ip || req.connection.remoteAddress;
    if (device.macAddress !== macAddress) {

      const existingDevice = await Device.findOne({ macAddress });
      if (existingDevice && existingDevice._id.toString() !== device._id.toString()) {
        console.log(`[Auth] Clearing duplicate MAC ${macAddress} from old device ${existingDevice.deviceId}`);

        await Device.findByIdAndDelete(existingDevice._id);
      }
      device.macAddress = macAddress;
    }
    await device.save();

    await redis.set(
      `device:heartbeat:${device.macAddress}`,
      new Date().toISOString(),
      'EX',
      65
    );

    if (device.organizationId) {
      const onlineDevices = await Device.find({
        organizationId: device.organizationId,
        status: 'online'
      });
      const topology = onlineDevices.map(d => ({
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
      emitDeviceUpdate('topology:update', { devices: topology }, device.organizationId.toString());
    }

    console.log(`[Auth] Device ${deviceId} authenticated → status: online`);

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

    const effectiveMac = macAddress || device.macAddress;

    await redis.set(
      `device:heartbeat:${effectiveMac}`,
      new Date().toISOString(),
      'EX',
      65   
    );

    await publishHeartbeat(effectiveMac, status || 'online', rssi, ipAddress).catch(() => {});

    const now = new Date();
    const lastUpdate = device.lastSeen;
    const secondsSinceLastUpdate = lastUpdate ? (now - new Date(lastUpdate)) / 1000 : 60;
    const wasOffline = device.status !== 'online';

    if (wasOffline || secondsSinceLastUpdate >= 30) {
      const updateFields = {
        status: 'online',
        lastSeen: now,
      };
      if (rssi      != null) updateFields.rssi      = rssi;
      if (ipAddress)         updateFields.ipAddress  = ipAddress;
      if (macAddress)        updateFields.macAddress = macAddress;
      if (freeHeap  != null) updateFields['metadata.freeHeap'] = String(freeHeap);
      if (uptime    != null) updateFields['metadata.uptime']    = String(uptime);

      await Device.findOneAndUpdate({ deviceId }, { $set: updateFields });

      if (wasOffline) {
        console.log(`[Heartbeat] ${deviceId} came back ONLINE`);
      }

      if (device.organizationId) {
        const onlineDevices = await Device.find({
          organizationId: device.organizationId,
          status: 'online',
        });
        const topology = onlineDevices.map((d) => ({
          id:            d._id,
          mac:           d.macAddress,
          name:          d.name,
          status:        d.status,
          lastSeen:      d.lastSeen,
          connectionType: d.connectionType,
          rssi:          d.rssi,
          ipAddress:     d.ipAddress,
          authenticated: d.provisioned,
        }));
        emitDeviceUpdate('topology:update', { devices: topology });
      }
    }

    console.log(`[Heartbeat] ${deviceId} → online (${secondsSinceLastUpdate.toFixed(0)}s since last DB write)`);
    return res.status(200).json({ success: true, status: 'online', ttl: 65 });
  } catch (error) {
    console.error('deviceHeartbeat error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

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

    if (savedLog) {

      const redisKey = `device:${logData.macAddress}:netlogs`;
      const logEntry = JSON.stringify({
        id:         savedLog._id,
        macAddress: savedLog.macAddress,
        deviceName: savedLog.deviceName,
        srcIp:      savedLog.srcIp,
        dstIp:      savedLog.dstIp,
        protocol:   savedLog.protocol,
        srcPort:    savedLog.srcPort,
        dstPort:    savedLog.dstPort,
        prediction: savedLog.prediction,
        confidence: savedLog.confidence,
        action:     savedLog.action,
        timestamp:  savedLog.timestamp,
      });

      await redis.lpush(redisKey, logEntry);
      await redis.ltrim(redisKey, 0, 199);
      await redis.expire(redisKey, 1800); 

      if (device.organizationId) {

        emitDeviceUpdate('network:log:new', {
          log: {
            id:         savedLog._id,
            macAddress: savedLog.macAddress,
            deviceName: savedLog.deviceName,
            srcIp:      savedLog.srcIp,
            dstIp:      savedLog.dstIp,
            protocol:   savedLog.protocol,
            srcPort:    savedLog.srcPort,
            dstPort:    savedLog.dstPort,
            prediction: savedLog.prediction,
            confidence: savedLog.confidence,
            action:     savedLog.action,
            timestamp:  savedLog.timestamp,
          }
        });
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('deviceNetworkLog error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

export async function getDeviceNetlogs(req, res) {
  try {
    const { mac } = req.params;
    const limit = Math.min(parseInt(req.query.limit) || 50, 200);
    const redisKey = `device:${mac}:netlogs`;
    const raw = await redis.lrange(redisKey, 0, limit - 1);
    const logs = raw.map(entry => JSON.parse(entry));
    return res.status(200).json({ success: true, logs });
  } catch (error) {
    console.error('getDeviceNetlogs error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
