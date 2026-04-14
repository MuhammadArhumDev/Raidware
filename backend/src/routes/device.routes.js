import express from "express";
import * as deviceService from "../services/device.service.js";
import {
  cacheDeviceAuth,
  checkDeviceAuth,
  revokeDeviceAuth,
} from "../services/deviceAuth.service.js";
import { getTopologyForOrg } from "../services/socket.service.js";
import { provisionDevice } from "../services/provisionDevice.service.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import Device from "../models/Device.js";
import redis from "../config/redis.js";
import crypto from "crypto";
import { getLogsForOrg } from '../services/networkLog.service.js';
import {
  generateDeviceKeys,
  authenticateDevice,
  getCopyableSecrets,
  verifyServerSignature
} from '../controllers/deviceProvisioning.controller.js';

const router = express.Router();

// ──────────────────────────────────────────────
// EXISTING ROUTES
// ──────────────────────────────────────────────

// Register a device
router.post("/register", async (req, res, next) => {
  try {
    const { deviceId, publicKey } = req.body;
    if (!deviceId || !publicKey) {
      return res.status(400).json({ error: "Missing deviceId or publicKey" });
    }
    const result = await deviceService.registerDevice(deviceId, publicKey);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

// Authenticate
router.post("/auth", async (req, res, next) => {
  try {
    const { deviceId, timestamp, nonce, signature } = req.body;
    if (!deviceId || !timestamp || !nonce || !signature) {
      return res.status(400).json({ error: "Missing auth parameters" });
    }
    const result = await deviceService.authenticateDevice(
      deviceId,
      timestamp,
      nonce,
      signature
    );
    res.status(200).json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Heartbeat / Data update
router.post("/heartbeat", async (req, res, next) => {
  try {
    const { deviceId, payload } = req.body;
    if (!deviceId) {
      return res.status(400).json({ error: "Missing deviceId" });
    }
    await deviceService.updateHeartbeat(deviceId, payload);
    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
});

// Get all devices (for frontend)
router.get("/", async (req, res, next) => {
  try {
    const devices = await deviceService.getAllDevices();
    res.status(200).json(devices);
  } catch (error) {
    next(error);
  }
});

// ──────────────────────────────────────────────
// REDIS DEVICE AUTH HASH CACHE ROUTES
// ──────────────────────────────────────────────

// Cache a device auth hash after successful mTLS authentication
router.post("/auth/cache", async (req, res, next) => {
  try {
    const { macAddress, deviceId } = req.body;

    if (!macAddress || !deviceId) {
      return res
        .status(400)
        .json({ error: "Missing macAddress or deviceId" });
    }

    const hash = await cacheDeviceAuth(macAddress, deviceId);
    res.status(200).json({
      success: true,
      hash,
      message: "Device auth cached",
    });
  } catch (error) {
    next(error);
  }
});

// Check if a device's auth hash exists in Redis
router.get("/auth/check/:macAddress", async (req, res, next) => {
  try {
    const macAddress = decodeURIComponent(req.params.macAddress);
    const result = await checkDeviceAuth(macAddress);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
});

// Revoke a device's auth hash (instant lockout)
router.delete("/auth/revoke", async (req, res, next) => {
  try {
    const { macAddress } = req.body;

    if (!macAddress) {
      return res.status(400).json({ error: "Missing macAddress" });
    }

    const result = await revokeDeviceAuth(macAddress);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
});

// ──────────────────────────────────────────────
// TOPOLOGY & ORG DEVICE ROUTES
// ──────────────────────────────────────────────

// Get mesh topology for a specific organization
router.get("/topology/:orgId", verifyToken, async (req, res) => {
  try {
    const { orgId } = req.params;
    const devices = await Device.find({ organizationId: orgId });
    
    const mappedDevices = devices.map(device => ({
      id: device._id,
      mac: device.macAddress,
      name: device.name,
      status: device.status,
      lastSeen: device.lastSeen,
      connectionType: device.connectionType,
      rssi: device.rssi,
      ipAddress: device.ipAddress,
      authenticated: device.provisioned
    }));

    res.status(200).json({
      success: true,
      devices: mappedDevices,
      count: mappedDevices.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get all devices for an organization (admin dashboard device list)
router.get("/org/:orgId", verifyToken, async (req, res) => {
  try {
    const { orgId } = req.params;
    const devices = await Device.find({ organizationId: orgId })
      .select("macAddress name status lastSeen connectionType provisioned ipAddress")
      .sort({ lastSeen: -1 });

    const activeDevices = devices.filter(d => d.connectionType === 'direct' || d.provisioned);

    res.status(200).json({
      success: true,
      devices: activeDevices,
      count: activeDevices.length
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Revoke a device — delete Redis auth key + set offline in MongoDB
router.post("/revoke", verifyToken, async (req, res) => {
  try {
    const { macAddress } = req.body;

    if (!macAddress) {
      return res.status(400).json({ success: false, error: 'macAddress is required' });
    }

    // Delete Redis auth key
    await redis.del(`device:${macAddress}:auth`);

    // Set device offline in MongoDB
    await Device.findOneAndUpdate(
      { macAddress },
      { status: "offline", lastSeen: new Date() }
    );

    res.status(200).json({ success: true, revoked: true, macAddress });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ──────────────────────────────────────────────
// PROVISIONING ROUTE
// ──────────────────────────────────────────────

// Provision a new device
router.post("/provision", verifyToken, async (req, res) => {
  try {
    const { macAddress, orgId, deviceName } = req.body;

    if (!macAddress || !orgId) {
      return res.status(400).json({ success: false, error: 'macAddress and orgId are required' });
    }

    const bundle = await provisionDevice(macAddress, orgId, deviceName);
    res.status(201).json({ success: true, data: bundle });
  } catch (error) {
    if (error.message === 'Device already provisioned') {
      return res.status(409).json({ success: false, error: 'Device already provisioned' });
    }
    res.status(500).json({ success: false, error: error.message });
  }
});

// ──────────────────────────────────────────────
// NETWORK LOGS ROUTES
// ──────────────────────────────────────────────

// Get alerts only
router.get("/logs/:orgId/alerts", verifyToken, async (req, res) => {
  try {
    const { orgId } = req.params;
    let limit = parseInt(req.query.limit, 10) || 50;
    if (limit > 200) limit = 200;
    const skip = parseInt(req.query.skip, 10) || 0;

    const logs = await getLogsForOrg(orgId, { limit, skip, alertsOnly: true });
    res.status(200).json({ success: true, logs, count: logs.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get network logs for an organization
router.get("/logs/:orgId", verifyToken, async (req, res) => {
  try {
    const { orgId } = req.params;
    let limit = parseInt(req.query.limit, 10) || 50;
    if (limit > 200) limit = 200;
    const skip = parseInt(req.query.skip, 10) || 0;
    const alertsOnly = req.query.alertsOnly === 'true';

    const logs = await getLogsForOrg(orgId, { limit, skip, alertsOnly });
    res.status(200).json({ success: true, logs, count: logs.length });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Device Provisioning Routes (HMAC + Key Generation)
router.post('/device-provisioning/generate-keys/:orgId', verifyToken, generateDeviceKeys);
router.post('/device-provisioning/authenticate', authenticateDevice); // No auth needed (device doesn't have token yet)
router.get('/device-provisioning/copy-secrets/:orgId/:macAddress', verifyToken, getCopyableSecrets);
router.post('/device-provisioning/verify-server-signature', verifyServerSignature);

export default router;
