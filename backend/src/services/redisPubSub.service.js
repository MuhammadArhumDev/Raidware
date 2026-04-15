import Redis from 'ioredis';
import Device from '../models/Device.js';

let publisher = null;
let subscriber = null;

function buildRedisConfig() {
  const url = process.env.REDIS_URL || 'redis://5.189.167.55:6379';

  return {
    retryStrategy: (times) => {
      if (times > 5) return null;
      return Math.min(times * 500, 3000);
    },
  };
}

async function getOnlineDevicesForOrg(orgId) {
  const devices = await Device.find({
    organizationId: orgId,
    status: 'online',
  }).select('_id macAddress name status lastSeen meshRole rssi parentMac ipAddress connectionType provisioned');

  return devices.map((d) => ({
    id: d._id,
    mac: d.macAddress,
    name: d.name,
    status: d.status,
    lastSeen: d.lastSeen,
    meshRole: d.meshRole,
    rssi: d.rssi,
    parentMac: d.parentMac,
    ipAddress: d.ipAddress,
    connectionType: d.connectionType,
    authenticated: d.provisioned,
  }));
}

export async function initRedisPubSub(io) {
  const redisUrl = process.env.REDIS_URL || 'redis://5.189.167.55:6379';
  const cfg = buildRedisConfig();

  publisher  = new Redis(redisUrl, cfg);
  subscriber = new Redis(redisUrl, cfg);

  subscriber.subscribe('__keyevent@0__:expired', (err, count) => {
    if (err) {
      console.error('[RedisPubSub] Failed to subscribe to expiration events:', err.message);
    } else {
      console.log(`[RedisPubSub] Subscribed to ${count} key expiration channel(s)`);
    }
  });

  subscriber.subscribe('heartbeat:update', (err, count) => {
    if (err) {
      console.error('[RedisPubSub] Failed to subscribe to heartbeat:update:', err.message);
    } else {
      console.log(`[RedisPubSub] Subscribed to heartbeat:update channel`);
    }
  });

  subscriber.on('message', async (channel, payload) => {

    if (channel === '__keyevent@0__:expired' && payload.startsWith('device:heartbeat:')) {
      const macAddress = payload.replace('device:heartbeat:', '');

      try {
        const device = await Device.findOne({ macAddress });
        if (!device || device.status !== 'online') return;

        const secondsSinceLastSeen = device.lastSeen
          ? (Date.now() - new Date(device.lastSeen).getTime()) / 1000
          : Infinity;

        if (secondsSinceLastSeen < 65) {
          console.log(`[RedisPubSub] Ignoring stale key expiry for ${macAddress} — last seen ${secondsSinceLastSeen.toFixed(0)}s ago (< 65s grace)`);
          return;
        }

        await Device.findOneAndUpdate(
          { macAddress },
          { status: 'offline', lastSeen: new Date() }
        );
        console.log(`[RedisPubSub] Device ${macAddress} marked OFFLINE (last seen ${secondsSinceLastSeen.toFixed(0)}s ago)`);

        if (io) {
          const topology = await getOnlineDevicesForOrg(device.organizationId);
          io.emit('topology:update', { devices: topology });
        }
      } catch (err) {
        console.error('[RedisPubSub] Error handling expiration for', macAddress, err.message);
      }
      return;
    }

    if (channel === 'heartbeat:update') {
      try {
        const data = JSON.parse(payload);
        console.log(`[RedisPubSub] Received heartbeat update for ${data.macAddress}`);

        const device = await Device.findOne({ macAddress: data.macAddress });
        if (device && device.status !== 'online') {
          await Device.findOneAndUpdate(
            { macAddress: data.macAddress },
            {
              status: 'online',
              lastSeen: new Date(),
              ...(data.rssi      != null && { rssi:      data.rssi }),
              ...(data.ipAddress         && { ipAddress: data.ipAddress }),
            }
          );

          if (io) {
            const topology = await getOnlineDevicesForOrg(device.organizationId);
            io.emit('topology:update', { devices: topology });
          }
        }
      } catch (err) {
        console.error('[RedisPubSub] Error processing heartbeat:update:', err.message);
      }
      return;
    }
  });

  publisher.on('error',  (err) => console.error('[RedisPubSub][publisher] error:', err.message));
  subscriber.on('error', (err) => console.error('[RedisPubSub][subscriber] error:', err.message));

  console.log('[RedisPubSub] Redis Pub/Sub initialized');
}

export async function publishHeartbeat(macAddress, status, rssi, ipAddress) {
  if (!publisher) return;

  const heartbeatData = {
    macAddress,
    status: status || 'online',
    rssi,
    ipAddress,
    timestamp: new Date().toISOString(),
  };

  await publisher.publish('heartbeat:update', JSON.stringify(heartbeatData));
}

export async function closeRedisConnections() {
  if (publisher)  await publisher.quit();
  if (subscriber) await subscriber.quit();
  console.log('[RedisPubSub] Connections closed');
}
