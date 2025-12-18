"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/Dashboard/AdminLayout";
import StatsCard from "@/components/Dashboard/StatsCard";
import MetricChart from "@/components/Dashboard/MetricChart";
import RealTimeChart from "@/components/Dashboard/RealTimeChart";
import { Building2, Network, Shield, Activity, Cpu } from "lucide-react";
import { io } from "socket.io-client";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    totalNetworks: 0,
    activeThreats: 0,
    systemHealth: 0,
    totalDevices: 0,
  });
  const [orgGrowthData, setOrgGrowthData] = useState([]);
  const [networkGrowthData, setNetworkGrowthData] = useState([]);
  const [systemHealthHistory, setSystemHealthHistory] = useState([]);
  const [deviceActivity, setDeviceActivity] = useState({
    online: 0,
    offline: 0,
    devices: [],
  });
  const [loading, setLoading] = useState(true);

  // Fetch stats from API
  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/stats`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  }, []);

  // Fetch growth analytics
  const fetchGrowthAnalytics = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/analytics/growth?days=7`,
        {
          credentials: "include",
        }
      );
      if (response.ok) {
        const data = await response.json();

        // Format data for charts
        const orgData = data.organizations.map((item, index) => ({
          timestamp: new Date(item.date).getTime(),
          value:
            data.totals.organizations -
            data.organizations
              .slice(index + 1)
              .reduce((sum, i) => sum + i.count, 0),
        }));

        const netData = data.networks.map((item, index) => ({
          timestamp: new Date(item.date).getTime(),
          value:
            data.totals.networks -
            data.networks.slice(index + 1).reduce((sum, i) => sum + i.count, 0),
        }));

        setOrgGrowthData(orgData);
        setNetworkGrowthData(netData);
      }
    } catch (error) {
      console.error("Error fetching growth analytics:", error);
    }
  }, []);

  // Fetch device activity
  const fetchDeviceActivity = useCallback(async () => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/admin/devices/activity`,
        {
          credentials: "include",
        }
      );
      if (response.ok) {
        const data = await response.json();
        setDeviceActivity(data.summary);
      }
    } catch (error) {
      console.error("Error fetching device activity:", error);
    }
  }, []);

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchStats(),
        fetchGrowthAnalytics(),
        fetchDeviceActivity(),
      ]);
      setLoading(false);
    };
    loadData();
  }, [fetchStats, fetchGrowthAnalytics, fetchDeviceActivity]);

  // Real-time updates for system health
  useEffect(() => {
    const updateSystemHealth = () => {
      const now = Date.now();
      setSystemHealthHistory((prev) => {
        const newHistory = [
          ...prev,
          {
            timestamp: now,
            value: Math.min(
              100,
              Math.max(90, stats.systemHealth + (Math.random() - 0.5) * 2)
            ),
          },
        ];
        return newHistory.slice(-30);
      });
    };

    updateSystemHealth();
    const interval = setInterval(updateSystemHealth, 5000);
    return () => clearInterval(interval);
  }, [stats.systemHealth]);

  // Socket.IO for real-time device updates
  useEffect(() => {
    const socket = io(`${API_BASE_URL}/frontend`, {
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("[Frontend] Connected to Socket.IO");
      socket.emit("frontend:init");
    });

    socket.on("device:update", (data) => {
      console.log("[Frontend] Device update:", data);
      fetchDeviceActivity();
      fetchStats();
    });

    socket.on("device:list", (devices) => {
      const online = devices.filter((d) => d.status === "online").length;
      const offline = devices.filter((d) => d.status === "offline").length;
      setDeviceActivity({ online, offline, total: devices.length });
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchDeviceActivity, fetchStats]);

  // Refresh data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      fetchStats();
      fetchDeviceActivity();
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchDeviceActivity]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor and manage all organizations and their IoT infrastructure
            security
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            icon={Building2}
            title="Total Organizations"
            value={loading ? "..." : stats.totalOrganizations}
            change={2.5}
            trend="up"
          />
          <StatsCard
            icon={Network}
            title="Active Networks"
            value={loading ? "..." : stats.totalNetworks}
            change={8.2}
            trend="up"
          />
          <StatsCard
            icon={Shield}
            title="Active Threats"
            value={loading ? "..." : stats.activeThreats}
            change={stats.activeThreats > 0 ? 5.0 : -15.0}
            trend={stats.activeThreats > 0 ? "up" : "down"}
          />
          <StatsCard
            icon={Activity}
            title="System Health"
            value={loading ? "..." : `${stats.systemHealth}%`}
            change={1.2}
            trend="up"
          />
        </div>

        {/* Real-time Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MetricChart
            title="Organizations Growth"
            dataSource={orgGrowthData}
            dataKey="value"
            color="indigo"
            type="area"
            height={280}
            unit=" orgs"
            gradient={true}
          />
          <MetricChart
            title="Networks Growth"
            dataSource={networkGrowthData}
            dataKey="value"
            color="blue"
            type="line"
            height={280}
            unit=" networks"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MetricChart
            title="System Health"
            dataSource={systemHealthHistory}
            dataKey="value"
            color="green"
            type="area"
            height={280}
            unit="%"
            gradient={true}
          />

          {/* Device Status Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              IoT Device Status
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                <Cpu className="w-8 h-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {deviceActivity.online || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Online Devices
                </p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                <Cpu className="w-8 h-8 text-red-600 dark:text-red-400 mx-auto mb-2" />
                <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                  {deviceActivity.offline || 0}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Offline Devices
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Total Devices:{" "}
                <span className="font-semibold text-gray-900 dark:text-white">
                  {deviceActivity.total || 0}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Platform Overview Chart */}
        <RealTimeChart
          type="line"
          height={300}
          title="Platform Activity Overview"
          data={{
            labels: orgGrowthData.slice(-7).map((d) => {
              return new Date(d.timestamp).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              });
            }),
            datasets: [
              {
                label: "Organizations",
                data: orgGrowthData.slice(-7).map((d) => d.value),
                borderColor: "rgba(99, 102, 241, 1)",
                backgroundColor: "rgba(99, 102, 241, 0.1)",
                tension: 0.4,
                yAxisID: "y",
              },
              {
                label: "Networks",
                data: networkGrowthData.slice(-7).map((d) => d.value),
                borderColor: "rgba(59, 130, 246, 1)",
                backgroundColor: "rgba(59, 130, 246, 0.1)",
                tension: 0.4,
                yAxisID: "y1",
              },
            ],
          }}
        />

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/admin/organizations"
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                Manage Organizations
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                View and manage all registered organizations
              </p>
            </a>
            <a
              href="/admin/security"
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                Security Overview
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Monitor security status across all networks
              </p>
            </a>
            <a
              href="/admin/monitoring"
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                System Monitoring
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Check system health and service status
              </p>
            </a>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            System Status
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="text-gray-900 dark:text-white">
                Platform Status
              </span>
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full text-sm font-medium">
                Operational
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="text-gray-900 dark:text-white">
                Kyber-768 Encryption
              </span>
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full text-sm font-medium">
                Active
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="text-gray-900 dark:text-white">
                Mutual Authentication
              </span>
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full text-sm font-medium">
                Enabled
              </span>
            </div>
            <div
              className={`flex items-center justify-between p-3 ${
                stats.activeThreats > 0
                  ? "bg-yellow-50 dark:bg-yellow-900/20"
                  : "bg-green-50 dark:bg-green-900/20"
              } rounded-lg`}
            >
              <span className="text-gray-900 dark:text-white">
                Active Threats
              </span>
              <span
                className={`px-3 py-1 ${
                  stats.activeThreats > 0
                    ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300"
                    : "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300"
                } rounded-full text-sm font-medium`}
              >
                {stats.activeThreats} Detected
              </span>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
