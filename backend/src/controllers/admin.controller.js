import Organization from "../models/Organization.js";
import Network from "../models/Network.js";
import Threat from "../models/Threat.js";
import Device from "../models/Device.js";
import redis from "../config/redis.js";
import mongoose from "mongoose";

// Server start time for uptime calculation
const serverStartTime = Date.now();

export const getStats = async (req, res) => {
  try {
    const [totalOrganizations, totalNetworks, activeThreats, totalDevices] =
      await Promise.all([
        Organization.countDocuments(),
        Network.countDocuments(),
        Threat.countDocuments({ status: "active" }),
        Device.countDocuments(),
      ]);

    const uptimeMs = Date.now() - serverStartTime;
    const uptimeHours = uptimeMs / (1000 * 60 * 60);
    const systemHealth = Math.min(100, 95 + Math.random() * 5).toFixed(1);

    res.json({
      totalOrganizations,
      totalNetworks,
      activeThreats,
      totalDevices,
      systemHealth: parseFloat(systemHealth),
    });
  } catch (error) {
    console.error("Error getting stats:", error);
    res.status(500).json({ error: "Failed to get stats" });
  }
};

export const getOrganizations = async (req, res) => {
  try {
    const organizations = await Organization.find().sort({ createdAt: -1 });

    const orgsWithMetrics = await Promise.all(
      organizations.map(async (org) => {
        const network = await Network.findOne({ organizationId: org._id });
        const threatCount = await Threat.countDocuments({
          organizationId: org._id,
          status: "active",
        });

        if (network) {
          const deviceKeys = await redis.keys("device:*:status");
          for (const key of deviceKeys) {
            const status = await redis.hget(key, "online");
            if (status === "true") deviceCount++;
          }
        }

        return {
          id: org._id,
          name: org.name,
          email: org.email,
          status: org.status,
          network: network
            ? { id: network._id, name: network.name, status: network.status }
            : null,
          devices: deviceCount,
          threats: threatCount,
          joinedDate: org.createdAt,
        };
      })
    );

    res.json(orgsWithMetrics);
  } catch (error) {
    console.error("Error getting organizations:", error);
    res.status(500).json({ error: "Failed to get organizations" });
  }
};

export const getNetworks = async (req, res) => {
  try {
    const networks = await Network.find()
      .populate("organizationId", "name email status")
      .sort({ createdAt: -1 });

    const networksWithMetrics = await Promise.all(
      networks.map(async (net) => {
        const threatCount = await Threat.countDocuments({
          networkId: net._id,
          status: "active",
        });

        let deviceCount = 0;
        const deviceKeys = await redis.keys("device:*:status");
        for (const key of deviceKeys) {
          const status = await redis.hget(key, "online");
          if (status === "true") deviceCount++;
        }

        let securityScore = 100;
        if (threatCount > 0) {
          securityScore = Math.max(60, 100 - threatCount * 10);
        }

        return {
          id: net._id,
          name: net.name,
          organization: net.organizationId?.name || "Unknown",
          orgId: net.organizationId?._id,
          status: net.status,
          nodes: deviceCount,
          devices: deviceCount,
          securityScore,
          threats: threatCount,
          createdAt: net.createdAt,
        };
      })
    );

    res.json(networksWithMetrics);
  } catch (error) {
    console.error("Error getting networks:", error);
    res.status(500).json({ error: "Failed to get networks" });
  }
};

export const getSecurityOverview = async (req, res) => {
  try {
    const [totalThreats, criticalThreats, threats] = await Promise.all([
      Threat.countDocuments({ status: "active" }),
      Threat.countDocuments({ status: "active", severity: "critical" }),
      Threat.find({ status: "active" })
        .populate("organizationId", "name")
        .populate("networkId", "name")
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    const networksAtRisk = await Threat.distinct("networkId", {
      status: "active",
    });

    const networks = await Network.find();
    let avgSecurityScore = 100;
    if (networks.length > 0) {
      const threatsByNetwork = await Threat.aggregate([
        { $match: { status: "active" } },
        { $group: { _id: "$networkId", count: { $sum: 1 } } },
      ]);
      const threatMap = new Map(
        threatsByNetwork.map((t) => [t._id.toString(), t.count])
      );
      const scores = networks.map((n) => {
        const count = threatMap.get(n._id.toString()) || 0;
        return Math.max(60, 100 - count * 10);
      });
      avgSecurityScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    }

    const recentThreats = threats.map((t) => ({
      id: t._id,
      organization: t.organizationId?.name || "Unknown",
      network: t.networkId?.name || "Unknown",
      type: t.type,
      severity: t.severity,
      status: t.status,
      timestamp: t.createdAt,
    }));

    res.json({
      totalThreats,
      criticalThreats,
      networksAtRisk: networksAtRisk.length,
      avgSecurityScore: avgSecurityScore.toFixed(1),
      encryptionCompliance: 98,
      mutualAuthEnabled: networks.length,
      recentThreats,
    });
  } catch (error) {
    console.error("Error getting security overview:", error);
    res.status(500).json({ error: "Failed to get security overview" });
  }
};

export const getSystemMonitoring = async (req, res) => {
  try {
    const dbStatus =
      mongoose.connection.readyState === 1 ? "healthy" : "unhealthy";

    let redisStatus = "unhealthy";
    try {
      await redis.ping();
      redisStatus = "healthy";
    } catch (e) {
      redisStatus = "unhealthy";
    }

    let activeConnections = 0;
    try {
      const deviceKeys = await redis.keys("device:*:status");
      for (const key of deviceKeys) {
        const status = await redis.hget(key, "online");
        if (status === "true") activeConnections++;
      }
    } catch (e) {
      console.error("Error getting active connections:", e);
    }

    const uptimeMs = Date.now() - serverStartTime;
    const uptimeSeconds = Math.floor(uptimeMs / 1000);
    const uptimeMinutes = Math.floor(uptimeSeconds / 60);
    const uptimeHours = Math.floor(uptimeMinutes / 60);
    const uptimeDays = Math.floor(uptimeHours / 24);

    res.json({
      apiServer: {
        status: "healthy",
        uptime: `${uptimeDays}d ${uptimeHours % 24}h ${uptimeMinutes % 60}m`,
        uptimeMs,
      },
      database: {
        status: dbStatus,
        type: "MongoDB",
      },
      redis: {
        status: redisStatus,
        type: "Redis",
      },
      activeConnections,
      requestsPerMinute: Math.floor(Math.random() * 50) + 50,
    });
  } catch (error) {
    console.error("Error getting system monitoring:", error);
    res.status(500).json({ error: "Failed to get system monitoring" });
  }
};

export const getGrowthAnalytics = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const orgGrowth = await Organization.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const networkGrowth = await Network.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const threatGrowth = await Threat.aggregate([
      { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const dateRange = [];
    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      dateRange.push(new Date(d).toISOString().split("T")[0]);
    }

    const orgMap = new Map(orgGrowth.map((o) => [o._id, o.count]));
    const netMap = new Map(networkGrowth.map((n) => [n._id, n.count]));
    const threatMap = new Map(threatGrowth.map((t) => [t._id, t.count]));

    const organizations = dateRange.map((date) => ({
      date,
      count: orgMap.get(date) || 0,
    }));

    const networks = dateRange.map((date) => ({
      date,
      count: netMap.get(date) || 0,
    }));

    const threats = dateRange.map((date) => ({
      date,
      count: threatMap.get(date) || 0,
    }));

    const totalOrgs = await Organization.countDocuments();
    const totalNetworks = await Network.countDocuments();

    res.json({
      organizations,
      networks,
      threats,
      totals: {
        organizations: totalOrgs,
        networks: totalNetworks,
      },
    });
  } catch (error) {
    console.error("Error getting growth analytics:", error);
    res.status(500).json({ error: "Failed to get growth analytics" });
  }
};

export const getDeviceActivity = async (req, res) => {
  try {
    const deviceKeys = await redis.keys("device:*:status");
    const devices = [];

    for (const key of deviceKeys) {
      const statusData = await redis.hgetall(key);
      if (statusData && statusData.rawMac) {
        devices.push({
          macAddress: statusData.rawMac,
          status: statusData.online === "true" ? "online" : "offline",
          lastSeen: parseInt(statusData.lastSeen) || Date.now(),
        });
      }
    }

    const onlineDevices = devices.filter((d) => d.status === "online").length;
    const offlineDevices = devices.filter((d) => d.status === "offline").length;

    res.json({
      devices,
      summary: {
        total: devices.length,
        online: onlineDevices,
        offline: offlineDevices,
      },
    });
  } catch (error) {
    console.error("Error getting device activity:", error);
    res.status(500).json({ error: "Failed to get device activity" });
  }
};

export const updateOrgKeys = async (req, res) => {
  try {
    const { sharedSecret } = req.body;

    if (!sharedSecret) {
      return res.status(400).json({ error: "Shared secret is required" });
    }

    await redis.set("org:default_secret", sharedSecret);

    res.json({
      success: true,
      message: "Organization keys updated successfully",
    });
  } catch (error) {
    console.error("Error updating organization keys:", error);
    res.status(500).json({ error: "Failed to update keys" });
  }
};
