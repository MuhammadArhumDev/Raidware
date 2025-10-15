import express from "express";
import * as deviceService from "../services/device.service.js";

const router = express.Router();

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
    // In a real app, you'd verify a session token here
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

export default router;
