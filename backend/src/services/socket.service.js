import redis from '../config/redis.js';
import Device from '../models/Device.js';
import { initiateAuth, verifyAuthResponse, decryptPulse } from './deviceAuth.service.js';
import { saveAndAnalyzeLog } from './networkLog.service.js';

// Module-scoped Map: macAddress → setTimeout reference.
// Persists across multiple socket connection/disconnection cycles.
const graceTimers = new Map();

// ── Background heartbeat monitor ───────────────────────────────────────────
// Every 30 seconds: find devices that are marked 'online' in MongoDB but have
// no heartbeat key in Redis → they missed 65s of pulses → mark offline.
let _monitorInterval = null;

// NOTE: The heartbeat monitor is intentionally disabled.
// Redis Pub/Sub key expiration (device:heartbeat:{mac} with 65s TTL) is the sole
// authoritative mechanism for marking devices offline — after exactly 65 seconds
// of silence the key expires, the subscriber marks the device offline and broadcasts.
// A redundant DB-polling monitor introduced race conditions with the throttled
// MongoDB writes (30s interval) causing premature offline transitions.
function startHeartbeatMonitor(_io) {
  // Intentionally a no-op — see comment above.
  console.log('[Socket] Heartbeat monitor disabled — Redis key expiration is the offline authority');
}

// Returns ONLY online devices — used for topology:update broadcasts
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

    // ── join:org ─────────────────────────────────────────────────────────────
    // Frontend dashboard emits this right after connecting so it receives
    // org-scoped topology:update and network:log:new events.
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
          
          // Extend heartbeat TTL on reconnect — 65s sliding window
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

        // Set heartbeat key — 65s TTL (sliding window)
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

    // ── pulse ──────────────────────────────────────────────────────────────
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

        // Sliding window: only write MongoDB if last heartbeat was >30s ago
        const lastHeartbeat = await redis.get(`device:heartbeat:${socket.macAddress}`);
        const secondsSinceLast = lastHeartbeat
          ? (lastSeen - new Date(lastHeartbeat)) / 1000
          : Infinity;

        // Extend heartbeat TTL — 65s sliding window (always refresh)
        await redis.set(
          `device:heartbeat:${socket.macAddress}`,
          lastSeen.toISOString(),
          'EX',
          65
        );

        if (secondsSinceLast < 30) {
          // Skip MongoDB write — device already online, pulse too recent
          return;
        }

        // Check if device was previously offline → bring it back online
        const device = await Device.findOne({ macAddress: socket.macAddress }).select('status');
        if (device && device.status !== 'online') {
          await Device.findOneAndUpdate(
            { macAddress: socket.macAddress },
            { status: 'online', lastSeen, rssi, ipAddress: ip }
          );
          console.log(`[Socket] Device ${socket.macAddress} came back online`);

          // Broadcast immediate topology update
          const topology = await getTopologyForOrg(socket.orgId);
          _io.emit('topology:update', { devices: topology });
        } else {
          // Already online — just update lastSeen and stats
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
          const heartbeat = await redis.get(`device:heartbeat:${mac}`);
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
            io.emit('topology:update', { devices });
          }

          // Clean up heartbeat key (already expired, but just in case)
          await redis.del(`device:heartbeat:${mac}`);

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

  // Start background heartbeat monitor (marks stale devices offline every 30s)
  startHeartbeatMonitor(io);
  console.log('[Socket] Heartbeat monitor started — checks every 30s for 60s offline grace');
};

// Broadcasts event to all connected sockets.
// topology:update events are safe to broadcast globally because the frontend
// only stores devices it receives and the REST poll is the source of truth for org filtering.
export const emitDeviceUpdate = (event, data) => {
  if (!_io) {
    console.warn("emitDeviceUpdate called before socket service initialized");
    return;
  }
  _io.emit(event, data);
};
