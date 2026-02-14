import express from "express";
import * as deviceService from "../services/device.service.js";
import {
  cacheDeviceAuth,
  checkDeviceAuth,
  revokeDeviceAuth,
} from "../services/deviceAuth.service.js";
import { getTopologyForOrg } from "../services/socket.service.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import Device from "../models/Device.js";
import redis from "../config/redis.js";
import crypto from "crypto";

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
      meshRole: device.meshRole,
      rssi: device.rssi,
      parentMac: device.parentMac,
      ipAddress: device.ipAddress
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
      .select("macAddress name status lastSeen meshRole organizationId")
      .sort({ lastSeen: -1 });

    res.status(200).json({
      success: true,
      devices,
      count: devices.length
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

export default router;
