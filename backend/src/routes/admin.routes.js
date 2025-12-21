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

router.use(verifyToken, requireAdmin);

router.get("/stats", getStats);

router.get("/organizations", getOrganizations);

router.get("/networks", getNetworks);

router.get("/security", getSecurityOverview);

router.get("/monitoring", getSystemMonitoring);

router.get("/analytics/growth", getGrowthAnalytics);

router.get("/devices/activity", getDeviceActivity);

router.post("/settings/keys", updateOrgKeys);

export default router;
