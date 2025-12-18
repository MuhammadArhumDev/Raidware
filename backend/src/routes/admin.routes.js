import express from "express";
import { verifyToken, requireAdmin } from "../middleware/auth.middleware.js";
import {
  getStats,
  getOrganizations,
  getNetworks,
  getSecurityOverview,
  getSystemMonitoring,
  getGrowthAnalytics,
  getDeviceActivity,
  updateOrgKeys,
} from "../controllers/admin.controller.js";

const router = express.Router();

// All admin routes require authentication and admin role
router.use(verifyToken, requireAdmin);

// Dashboard stats
router.get("/stats", getStats);

// Organizations
router.get("/organizations", getOrganizations);

// Networks
router.get("/networks", getNetworks);

// Security overview
router.get("/security", getSecurityOverview);

// System monitoring
router.get("/monitoring", getSystemMonitoring);

// Growth analytics
router.get("/analytics/growth", getGrowthAnalytics);

// Device activity
router.get("/devices/activity", getDeviceActivity);

// Organization Keys
router.post("/settings/keys", updateOrgKeys);

export default router;
