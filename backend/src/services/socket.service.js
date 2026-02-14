import redis from '../config/redis.js';
import Device from '../models/Device.js';
import { initiateAuth, verifyAuthResponse, decryptPulse } from './deviceAuth.service.js';

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
    ipAddress: device.ipAddress
  }));
};

export const initSocketService = (io) => {
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
          
          await Device.findOneAndUpdate(
            { macAddress },
            { status: 'online', lastSeen: new Date() }
          );
          
          socket.emit('auth:success');
          
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
        
        await redis.set(`device:${socket.macAddress}:auth`, "1", "EX", 86400);

        await Device.findOneAndUpdate(
          { macAddress: socket.macAddress },
          { status: 'online', lastSeen: new Date(), organizationId: socket.orgId },
          { upsert: true, new: true }
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
          { status: status || 'online', lastSeen, rssi, ipAddress: ip }
        );

        await redis.set(`device:${socket.macAddress}:heartbeat`, lastSeen.toISOString(), "EX", 30);

        const topology = await getTopologyForOrg(socket.orgId);
        io.to(`org:${socket.orgId}`).emit('topology:update', { devices: topology });
      } catch (err) {
        console.error(`[Socket] pulse error:`, err);
      }
    });

    // ── disconnect ─────────────────────────────────────────────────────────
    socket.on('disconnect', async () => {
      try {
        if (socket.isAuthenticated && socket.macAddress) {
          console.log(`[Socket] Device ${socket.macAddress} disconnected`);
          
          await Device.findOneAndUpdate(
            { macAddress: socket.macAddress },
            { status: 'offline', lastSeen: new Date() }
          );

          await redis.del(`device:${socket.macAddress}:heartbeat`);

          const topology = await getTopologyForOrg(socket.orgId);
          io.to(`org:${socket.orgId}`).emit('topology:update', { devices: topology });
        }
      } catch (err) {
        console.error(`[Socket] disconnect error:`, err);
      }
    });
  });
};
