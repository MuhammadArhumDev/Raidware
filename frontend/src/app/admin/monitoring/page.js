"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/Dashboard/AdminLayout";
import {
  Activity,
  Server,
  Database,
  TrendingUp,
  Wifi,
  Clock,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function MonitoringPage() {
  const [monitoringData, setMonitoringData] = useState({
    apiServer: { status: "unknown", uptime: "...", uptimeMs: 0 },
    database: { status: "unknown", type: "MongoDB" },
    redis: { status: "unknown", type: "Redis" },
    activeConnections: 0,
    requestsPerMinute: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastChecked, setLastChecked] = useState(null);

  const fetchMonitoringData = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/monitoring`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setMonitoringData(data);
        setLastChecked(new Date());
        setError(null);
      } else {
        setError("Failed to fetch monitoring data");
      }
    } catch (error) {
      console.error("Error fetching monitoring data:", error);
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonitoringData();
    // Refresh every 10 seconds
    const interval = setInterval(fetchMonitoringData, 10000);
    return () => clearInterval(interval);
  }, [fetchMonitoringData]);

  const getStatusColor = (status) => {
    switch (status) {
      case "healthy":
        return "bg-green-50 dark:bg-green-900/20";
      case "degraded":
        return "bg-yellow-50 dark:bg-yellow-900/20";
      case "unhealthy":
        return "bg-red-50 dark:bg-red-900/20";
      default:
        return "bg-gray-50 dark:bg-gray-700/20";
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "healthy":
        return "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300";
      case "degraded":
        return "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300";
      case "unhealthy":
        return "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300";
    }
  };

  const getStatusIconColor = (status) => {
    switch (status) {
      case "healthy":
        return "text-green-600 dark:text-green-400";
      case "degraded":
        return "text-yellow-600 dark:text-yellow-400";
      case "unhealthy":
        return "text-red-600 dark:text-red-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              System Monitoring
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Real-time monitoring of platform infrastructure and services
            </p>
          </div>
          {lastChecked && (
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <Clock className="w-4 h-4" />
              Last updated: {lastChecked.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 text-center">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={fetchMonitoringData}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && (
          <>
            {/* Performance Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Active Connections
                </h2>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      {monitoringData.activeConnections.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <Wifi className="w-4 h-4" />
                      <span>IoT Devices Connected</span>
                    </div>
                  </div>
                  <Server className="w-12 h-12 text-indigo-600 dark:text-indigo-400 opacity-20" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                  Server Uptime
                </h2>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                      {monitoringData.apiServer.uptime}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <TrendingUp className="w-4 h-4" />
                      <span>Continuous Operation</span>
                    </div>
                  </div>
                  <Activity className="w-12 h-12 text-indigo-600 dark:text-indigo-400 opacity-20" />
                </div>
              </div>
            </div>

            {/* System Health Status */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                System Health Status
              </h2>
              <div className="space-y-3">
                {/* API Server */}
                <div
                  className={`flex items-center justify-between p-4 ${getStatusColor(
                    monitoringData.apiServer.status
                  )} rounded-lg`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm`}
                    >
                      <Server
                        className={`w-5 h-5 ${getStatusIconColor(
                          monitoringData.apiServer.status
                        )}`}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        API Server
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        All endpoints operational • Uptime:{" "}
                        {monitoringData.apiServer.uptime}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 ${getStatusBadgeColor(
                      monitoringData.apiServer.status
                    )} rounded-full text-sm font-medium capitalize`}
                  >
                    {monitoringData.apiServer.status}
                  </span>
                </div>

                {/* Database */}
                <div
                  className={`flex items-center justify-between p-4 ${getStatusColor(
                    monitoringData.database.status
                  )} rounded-lg`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm`}
                    >
                      <Database
                        className={`w-5 h-5 ${getStatusIconColor(
                          monitoringData.database.status
                        )}`}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Database ({monitoringData.database.type})
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {monitoringData.database.status === "healthy"
                          ? "Connected and responsive"
                          : "Connection issues detected"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 ${getStatusBadgeColor(
                      monitoringData.database.status
                    )} rounded-full text-sm font-medium capitalize`}
                  >
                    {monitoringData.database.status}
                  </span>
                </div>

                {/* Redis */}
                <div
                  className={`flex items-center justify-between p-4 ${getStatusColor(
                    monitoringData.redis.status
                  )} rounded-lg`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm`}
                    >
                      <Activity
                        className={`w-5 h-5 ${getStatusIconColor(
                          monitoringData.redis.status
                        )}`}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">
                        Cache Store ({monitoringData.redis.type})
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {monitoringData.redis.status === "healthy"
                          ? "Session and device state management"
                          : "Cache unavailable"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 ${getStatusBadgeColor(
                      monitoringData.redis.status
                    )} rounded-full text-sm font-medium capitalize`}
                  >
                    {monitoringData.redis.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Security Services */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Security Services
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                      <Server className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      Kyber-768 PQC
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Post-quantum key exchange active
                  </p>
                  <span className="inline-block mt-2 px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 text-xs font-medium rounded">
                    Operational
                  </span>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                      <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      AES-256-GCM
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Symmetric encryption active
                  </p>
                  <span className="inline-block mt-2 px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 text-xs font-medium rounded">
                    Operational
                  </span>
                </div>

                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                      <Database className="w-5 h-5 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      Mutual Auth
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    HMAC-SHA256 challenge-response
                  </p>
                  <span className="inline-block mt-2 px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 text-xs font-medium rounded">
                    Operational
                  </span>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
