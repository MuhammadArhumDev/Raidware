import redis from '../config/redis.js';
import Device from '../models/Device.js';
import { initiateAuth, verifyAuthResponse, decryptPulse } from './deviceAuth.service.js';
import { saveAndAnalyzeLog } from './networkLog.service.js';

const graceTimers = new Map();

let _monitorInterval = null;

function startHeartbeatMonitor(_io) {

  console.log('[Socket] Heartbeat monitor disabled — Redis key expiration is the offline authority');
}

export const getTopologyForOrg = async (orgId) => {
  const devices = await Device.find({ organizationId: orgId, status: 'online' });

  return devices.map(device => ({
    id: device._id,
    mac: device.macAddress,
    name: device.name,
    status: device.status,
    lastSeen: device.lastSeen,
    meshRole: device.meshRole,
    rssi: device.rssi,
    parentMac: device.parentMac,
    ipAddress: device.ipAddress,
    connectionType: device.connectionType,
    authenticated: device.provisioned
  }));
};

let _io = null;

export const initSocketService = (io) => {
  _io = io;
  io.on('connection', socket => {
    socket.isAuthenticated = false;

    socket.on('join:org', (orgId) => {
      if (!orgId) return;
      socket.join(`org:${orgId}`);
      console.log(`[Socket] Dashboard client joined org room: org:${orgId}`);
    });

    socket.on('auth:init', async (payload) => {
      try {
        if (!payload || !payload.macAddress || !payload.orgId) {
          socket.emit('auth:failed', { reason: 'Missing macAddress or orgId' });
          return;
        }

        const { macAddress, orgId } = payload;
        socket.macAddress = macAddress;
        socket.orgId = orgId;

        const authKey = `device:${macAddress}:auth`;
        const exists = await redis.exists(authKey);

        if (exists) {
          console.log(`[Socket] Device ${macAddress} authenticated via Redis fast-path`);
          socket.isAuthenticated = true;

          if (graceTimers.has(macAddress)) {
            clearTimeout(graceTimers.get(macAddress));
            graceTimers.delete(macAddress);
            console.log(`[Socket] Grace timer cancelled for ${macAddress} — device reconnected (fast-path).`);
          }

          await Device.findOneAndUpdate(
            { macAddress },
            { status: 'online', lastSeen: new Date() }
          );

          await redis.set(
            `device:heartbeat:${macAddress}`,
            new Date().toISOString(),
            'EX',
            65
          );

          socket.emit('auth:success');
          socket.join(`org:${orgId}`);

          const topology = await getTopologyForOrg(orgId);
          io.emit('topology:update', { devices: topology });
          return;
        }

        console.log(`[Socket] Proceeding to challenge flow for ${macAddress}`);
        const { nonce, pk } = await initiateAuth(macAddress);
        socket.emit('auth:challenge', { nonce, pk });
      } catch (err) {
        console.error(`[Socket] auth:init error:`, err);
      }
    });

    socket.on('auth:response', async (payload) => {
      try {
        if (!socket.macAddress) {
          socket.emit('auth:failed', { reason: 'No session' });
          return;
        }

        const { signature, ciphertext } = payload || {};
        const { success } = await verifyAuthResponse(socket.macAddress, signature, ciphertext);

        if (!success) {
          console.log(`[Socket] Invalid auth response for ${socket.macAddress}`);
          socket.emit('auth:failed', { reason: 'Invalid signature or ciphertext' });
          return;
        }

        console.log(`[Socket] Device ${socket.macAddress} successfully authenticated`);
        socket.isAuthenticated = true;

        if (graceTimers.has(socket.macAddress)) {
          clearTimeout(graceTimers.get(socket.macAddress));
          graceTimers.delete(socket.macAddress);
          console.log(`[Socket] Grace timer cancelled for ${socket.macAddress} — device reconnected.`);
        }

        await redis.set(`device:${socket.macAddress}:auth`, "1", "EX", 86400);

        await Device.findOneAndUpdate(
          { macAddress: socket.macAddress },
          { status: 'online', lastSeen: new Date(), organizationId: socket.orgId },
          { upsert: true, new: true }
        );

        await redis.set(
          `device:heartbeat:${socket.macAddress}`,
          new Date().toISOString(),
          'EX',
          65
        );

        socket.emit('auth:success');
        socket.join(`org:${socket.orgId}`);

        const topology = await getTopologyForOrg(socket.orgId);
        io.emit('topology:update', { devices: topology });
      } catch (err) {
        console.error(`[Socket] auth:response error:`, err);
      }
    });

    socket.on('pulse', async (payload) => {
      try {
        if (!socket.isAuthenticated) return;

        const decrypted = await decryptPulse(socket.macAddress, payload);
        if (!decrypted) {
          console.warn(`[Socket] Decryption failed for pulse from ${socket.macAddress}`);
          return;
        }

        const { status, rssi, ip } = decrypted;
        const lastSeen = new Date();

        const lastHeartbeat = await redis.get(`device:heartbeat:${socket.macAddress}`);
        const secondsSinceLast = lastHeartbeat
          ? (lastSeen - new Date(lastHeartbeat)) / 1000
          : Infinity;

        await redis.set(
          `device:heartbeat:${socket.macAddress}`,
          lastSeen.toISOString(),
          'EX',
          65
        );

        if (secondsSinceLast < 30) {

          return;
        }

        const device = await Device.findOne({ macAddress: socket.macAddress }).select('status');
        if (device && device.status !== 'online') {
          await Device.findOneAndUpdate(
            { macAddress: socket.macAddress },
            { status: 'online', lastSeen, rssi, ipAddress: ip }
          );
          console.log(`[Socket] Device ${socket.macAddress} came back online`);

          const topology = await getTopologyForOrg(socket.orgId);
          _io.emit('topology:update', { devices: topology });
        } else {

          await Device.findOneAndUpdate(
            { macAddress: socket.macAddress },
            { status: status || 'online', lastSeen, rssi, ipAddress: ip }
          );

          const topology = await getTopologyForOrg(socket.orgId);
          io.emit('topology:update', { devices: topology });
        }
      } catch (err) {
        console.error(`[Socket] pulse error:`, err);
      }
    });

    socket.on('disconnect', async (reason) => {
      if (!socket.isAuthenticated || !socket.macAddress) return;

      console.log(`[Socket] Device ${socket.macAddress} disconnected. Reason: ${reason}`);

      const graceMs = 60_000;
      const mac = socket.macAddress;
      const orgId = socket.orgId;

      const graceTimer = setTimeout(async () => {
        try {

          const heartbeat = await redis.get(`device:heartbeat:${mac}`);
          if (heartbeat) {
            console.log(`[Socket] Device ${mac} reconnected during grace period. Staying online.`);
            graceTimers.delete(mac);
            return;
          }

          await Device.findOneAndUpdate(
            { macAddress: mac },
            { status: 'offline', lastSeen: new Date() }
          );
          console.log(`[Socket] Device ${mac} marked offline after grace period.`);

          if (orgId) {
            const devices = await getTopologyForOrg(orgId);
            io.emit('topology:update', { devices });
          }

          await redis.del(`device:heartbeat:${mac}`);

          graceTimers.delete(mac);
        } catch (err) {
          console.error(`[Socket] Grace period error for ${mac}:`, err.message);
          graceTimers.delete(mac);
        }
      }, graceMs);

      graceTimers.set(mac, graceTimer);
      console.log(`[Socket] Grace timer started for ${mac} (${graceMs}ms)`);
    });

    socket.on('network:log', async (payload) => {

      if (!socket.isAuthenticated) {
        console.log('[Socket] Unauthenticated network:log ignored');
        return;
      }

      const logData = {
        orgId:        socket.orgId,
        macAddress:   socket.macAddress,
        deviceName:   payload.deviceName  || socket.macAddress,
        srcIp:        payload.srcIp       || '0.0.0.0',
        dstIp:        payload.dstIp       || '0.0.0.0',
        protocol:     payload.protocol    || 'TCP',
        srcPort:      payload.srcPort     || 0,
        dstPort:      payload.dstPort     || 0,
        flowDuration: payload.flowDuration || 0,
        packetCount:  payload.packetCount  || 0,
        byteCount:    payload.byteCount    || 0,
        features:     Array.isArray(payload.features) ? payload.features : []
      };

      const savedLog = await saveAndAnalyzeLog(logData);
      if (!savedLog) return;

      _io.to(`org:${socket.orgId}`).emit('network:log:new', {
        log: {
          id:           savedLog._id,
          macAddress:   savedLog.macAddress,
          deviceName:   savedLog.deviceName,
          srcIp:        savedLog.srcIp,
          dstIp:        savedLog.dstIp,
          protocol:     savedLog.protocol,
          srcPort:      savedLog.srcPort,
          dstPort:      savedLog.dstPort,
          prediction:   savedLog.prediction,
          confidence:   savedLog.confidence,
          action:       savedLog.action,
          timestamp:    savedLog.timestamp
        }
      });

      console.log(`[Socket] network:log processed | ${savedLog.macAddress} | ${savedLog.action}`);
    });
  });

  (async () => {
    try {
      const staleDevices = await Device.find({ status: 'online' });
      for (const device of staleDevices) {
        const heartbeat = await redis.get(`device:heartbeat:${device.macAddress}`);
        if (!heartbeat) {
          await Device.findOneAndUpdate(
            { macAddress: device.macAddress },
            { status: 'offline' }
          );
          console.log(`[Socket] Startup: marked ${device.macAddress} offline (no heartbeat in Redis)`);
        }
      }
      console.log(`[Socket] Startup cleanup complete. Checked ${staleDevices.length} devices.`);
    } catch (err) {
      console.error('[Socket] Startup cleanup error:', err.message);
    }
  })();

  startHeartbeatMonitor(io);
  console.log('[Socket] Heartbeat monitor started — checks every 30s for 60s offline grace');
};

export const emitDeviceUpdate = (event, data) => {
  if (!_io) {
    console.warn("emitDeviceUpdate called before socket service initialized");
    return;
  }
  _io.emit(event, data);
};
