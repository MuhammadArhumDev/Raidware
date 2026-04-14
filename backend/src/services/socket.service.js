import redis from '../config/redis.js';
import Device from '../models/Device.js';
import { initiateAuth, verifyAuthResponse, decryptPulse } from './deviceAuth.service.js';
import { saveAndAnalyzeLog } from './networkLog.service.js';

// Module-scoped Map: macAddress → setTimeout reference.
// Persists across multiple socket connection/disconnection cycles.
const graceTimers = new Map();

export const getTopologyForOrg = async (orgId) => {
  const devices = await Device.find({ organizationId: orgId });
  
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

    // ── auth:init ──────────────────────────────────────────────────────────
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
          
          // Cancel any pending grace timer from a previous disconnect
          if (graceTimers.has(macAddress)) {
            clearTimeout(graceTimers.get(macAddress));
            graceTimers.delete(macAddress);
            console.log(`[Socket] Grace timer cancelled for ${macAddress} — device reconnected (fast-path).`);
          }

          await Device.findOneAndUpdate(
            { macAddress },
            { status: 'online', lastSeen: new Date() }
          );
          
          // Extend heartbeat TTL on reconnect
          await redis.set(
            `device:${macAddress}:heartbeat`,
            new Date().toISOString(),
            'EX',
            60
          );

          socket.emit('auth:success');
          socket.join(`org:${orgId}`);
          
          const topology = await getTopologyForOrg(orgId);
          io.to(`org:${orgId}`).emit('topology:update', { devices: topology });
          return;
        }

        console.log(`[Socket] Proceeding to challenge flow for ${macAddress}`);
        const { nonce, pk } = await initiateAuth(macAddress);
        socket.emit('auth:challenge', { nonce, pk });
      } catch (err) {
        console.error(`[Socket] auth:init error:`, err);
      }
    });

    // ── auth:response ──────────────────────────────────────────────────────
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
        
        // Cancel any pending grace timer from a previous disconnect
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

        // Set heartbeat key with 60s TTL
        await redis.set(
          `device:${socket.macAddress}:heartbeat`,
          new Date().toISOString(),
          'EX',
          60
        );

        socket.emit('auth:success');
        socket.join(`org:${socket.orgId}`);

        const topology = await getTopologyForOrg(socket.orgId);
        io.to(`org:${socket.orgId}`).emit('topology:update', { devices: topology });
      } catch (err) {
        console.error(`[Socket] auth:response error:`, err);
      }
    });

    // ── pulse ──────────────────────────────────────────────────────────────
    socket.on('pulse', async (payload) => {
      try {
        if (!socket.isAuthenticated) return;

        const decrypted = await decryptPulse(socket.macAddress, payload);
        if (!decrypted) {
          console.warn(`[Socket] Decryption failed for pulse from ${socket.macAddress}`);
          return;
        }

        const { status, rssi, ip, freeHeap } = decrypted;
        const lastSeen = new Date();

        await Device.findOneAndUpdate(
          { macAddress: socket.macAddress },
          {
            status: status || 'online',
            lastSeen,
            rssi,
            ipAddress: ip
          }
        );

        // Extend heartbeat TTL to 60 seconds
        await redis.set(
          `device:${socket.macAddress}:heartbeat`,
          lastSeen.toISOString(),
          'EX',
          60
        );

        const topology = await getTopologyForOrg(socket.orgId);
        io.to(`org:${socket.orgId}`).emit('topology:update', { devices: topology });
      } catch (err) {
        console.error(`[Socket] pulse error:`, err);
      }
    });

    // ── disconnect ─────────────────────────────────────────────────────────
    socket.on('disconnect', async (reason) => {
      if (!socket.isAuthenticated || !socket.macAddress) return;

      console.log(`[Socket] Device ${socket.macAddress} disconnected. Reason: ${reason}`);

      // Grace period: wait 60 seconds before marking offline.
      // If the device reconnects and re-authenticates within that window,
      // the grace timer is cancelled and the device stays online.
      // 60s is much longer than the 3s heartbeat interval so missed
      // heartbeats do NOT trigger an offline event.
      const graceMs = 60_000;
      const mac = socket.macAddress;
      const orgId = socket.orgId;

      const graceTimer = setTimeout(async () => {
        try {
          // Check Redis: if heartbeat key still exists, device
          // reconnected successfully — do NOT mark offline.
          const heartbeat = await redis.get(`device:${mac}:heartbeat`);
          if (heartbeat) {
            console.log(`[Socket] Device ${mac} reconnected during grace period. Staying online.`);
            graceTimers.delete(mac);
            return;
          }

          // No heartbeat in Redis — device is genuinely offline.
          await Device.findOneAndUpdate(
            { macAddress: mac },
            { status: 'offline', lastSeen: new Date() }
          );
          console.log(`[Socket] Device ${mac} marked offline after grace period.`);

          // Broadcast topology update to org room.
          if (orgId) {
            const devices = await getTopologyForOrg(orgId);
            io.to(`org:${orgId}`).emit('topology:update', { devices });
          }

          // Clean up heartbeat key (already expired, but just in case)
          await redis.del(`device:${mac}:heartbeat`);

          // Remove from grace timers map
          graceTimers.delete(mac);
        } catch (err) {
          console.error(`[Socket] Grace period error for ${mac}:`, err.message);
          graceTimers.delete(mac);
        }
      }, graceMs);

      // Store timer in module-scoped Map for cancellation on reconnect
      graceTimers.set(mac, graceTimer);
      console.log(`[Socket] Grace timer started for ${mac} (${graceMs}ms)`);
    });

    // ── network:log ────────────────────────────────────────────────────────
    socket.on('network:log', async (payload) => {
      // 1. Ignore if not authenticated
      if (!socket.isAuthenticated) {
        console.log('[Socket] Unauthenticated network:log ignored');
        return;
      }

      // 2. Build logData from payload, filling defaults for missing fields
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

      // 3. Save + analyze (never throws — service handles errors internally)
      const savedLog = await saveAndAnalyzeLog(logData);
      if (!savedLog) return;

      // 4. Broadcast to org room so dashboard updates in real time
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

  // ── STARTUP WATCHDOG ──────────────────────────────────────────────────────
  // On startup: mark all devices offline that have no active heartbeat in Redis.
  // This fixes stale 'online' status from a previous server crash or restart.
  (async () => {
    try {
      const staleDevices = await Device.find({ status: 'online' });
      for (const device of staleDevices) {
        const heartbeat = await redis.get(`device:${device.macAddress}:heartbeat`);
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
};

export const emitDeviceUpdate = (event, data) => {
  if (!_io) {
    console.warn("emitDeviceUpdate called before socket service initialized");
    return;
  }
  _io.emit(event, data);
};
