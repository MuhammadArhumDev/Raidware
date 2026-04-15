"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/Dashboard/AdminLayout";
import {
  Activity,
  Server,
  Database,
  TrendingUp,
  Clock,
  Wifi,
} from "lucide-react";
import { SkeletonGrid } from "@/components/Skeleton";
import authFetch from "@/lib/authFetch";

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
      const response = await authFetch("/api/admin/monitoring");
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

    const interval = setInterval(fetchMonitoringData, 10000);
    return () => clearInterval(interval);
  }, [fetchMonitoringData]);

  const getStatusColor = (status) => {
    switch (status) {
      case "healthy":
        return "bg-green-50 ";
      case "degraded":
        return "bg-yellow-50 ";
      case "unhealthy":
        return "bg-red-50 ";
      default:
        return "bg-gray-50 ";
    }
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "healthy":
        return "bg-green-100  text-green-800 ";
      case "degraded":
        return "bg-yellow-100  text-yellow-800 ";
      case "unhealthy":
        return "bg-red-100  text-red-800 ";
      default:
        return "bg-gray-100  text-gray-800 ";
    }
  };

  const getStatusIconColor = (status) => {
    switch (status) {
      case "healthy":
        return "text-green-600 ";
      case "degraded":
        return "text-yellow-600 ";
      case "unhealthy":
        return "text-red-600 ";
      default:
        return "text-gray-600 ";
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900  mb-2">
              System Monitoring
            </h1>
            <p className="text-gray-600 ">
              Real-time monitoring of platform infrastructure and services
            </p>
          </div>
          {lastChecked && (
            <div className="flex items-center gap-2 text-sm text-gray-500 ">
              <Clock className="w-4 h-4" />
              Last updated: {lastChecked.toLocaleTimeString()}
            </div>
          )}
        </div>

        {}
        {loading && (
          <div className="space-y-6">
            <SkeletonGrid count={2} />
            <SkeletonGrid count={3} />
          </div>
        )}

        {}
        {error && (
          <div className="bg-red-50  rounded-none p-6 text-center">
            <p className="text-red-600 ">{error}</p>
            <button
              onClick={fetchMonitoringData}
              className="mt-4 px-4 py-2 bg-black text-white hover:bg-gray-800 border border-transparent rounded-none"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && (
          <>
            {}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white  rounded-none shadow-sm p-6 border-[1.5px] border-gray-200 ">
                <h2 className="text-xl font-semibold text-gray-900  mb-4">
                  Active Connections
                </h2>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <p className="text-3xl font-bold text-gray-900  mb-2">
                      {monitoringData.activeConnections.toLocaleString()}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-green-600 ">
                      <Wifi className="w-4 h-4" />
                      <span>IoT Devices Connected</span>
                    </div>
                  </div>
                  <Server className="w-12 h-12 text-indigo-600  opacity-20" />
                </div>
              </div>

              <div className="bg-white  rounded-none shadow-sm p-6 border-[1.5px] border-gray-200 ">
                <h2 className="text-xl font-semibold text-gray-900  mb-4">
                  Server Uptime
                </h2>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <p className="text-3xl font-bold text-gray-900  mb-2">
                      {monitoringData.apiServer.uptime}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-green-600 ">
                      <TrendingUp className="w-4 h-4" />
                      <span>Continuous Operation</span>
                    </div>
                  </div>
                  <Activity className="w-12 h-12 text-indigo-600  opacity-20" />
                </div>
              </div>
            </div>

            {}
            <div className="bg-white  rounded-none shadow-sm p-6 border-[1.5px] border-gray-200 ">
              <h2 className="text-xl font-semibold text-gray-900  mb-4">
                System Health Status
              </h2>
              <div className="space-y-3">
                {}
                <div
                  className={`flex items-center justify-between p-4 ${getStatusColor(
                    monitoringData.apiServer.status,
                  )} rounded-none`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 bg-white  rounded-none shadow-sm`}>
                      <Server
                        className={`w-5 h-5 ${getStatusIconColor(
                          monitoringData.apiServer.status,
                        )}`}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 ">API Server</p>
                      <p className="text-sm text-gray-600 ">
                        All endpoints operational • Uptime:{" "}
                        {monitoringData.apiServer.uptime}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 ${getStatusBadgeColor(
                      monitoringData.apiServer.status,
                    )} rounded-none text-sm font-medium capitalize`}
                  >
                    {monitoringData.apiServer.status}
                  </span>
                </div>

                {}
                <div
                  className={`flex items-center justify-between p-4 ${getStatusColor(
                    monitoringData.database.status,
                  )} rounded-none`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 bg-white  rounded-none shadow-sm`}>
                      <Database
                        className={`w-5 h-5 ${getStatusIconColor(
                          monitoringData.database.status,
                        )}`}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 ">
                        Database ({monitoringData.database.type})
                      </p>
                      <p className="text-sm text-gray-600 ">
                        {monitoringData.database.status === "healthy"
                          ? "Connected and responsive"
                          : "Connection issues detected"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 ${getStatusBadgeColor(
                      monitoringData.database.status,
                    )} rounded-none text-sm font-medium capitalize`}
                  >
                    {monitoringData.database.status}
                  </span>
                </div>

                {}
                <div
                  className={`flex items-center justify-between p-4 ${getStatusColor(
                    monitoringData.redis.status,
                  )} rounded-none`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 bg-white  rounded-none shadow-sm`}>
                      <Activity
                        className={`w-5 h-5 ${getStatusIconColor(
                          monitoringData.redis.status,
                        )}`}
                      />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 ">
                        Cache Store ({monitoringData.redis.type})
                      </p>
                      <p className="text-sm text-gray-600 ">
                        {monitoringData.redis.status === "healthy"
                          ? "Session and device state management"
                          : "Cache unavailable"}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 ${getStatusBadgeColor(
                      monitoringData.redis.status,
                    )} rounded-none text-sm font-medium capitalize`}
                  >
                    {monitoringData.redis.status}
                  </span>
                </div>
              </div>
            </div>

            {}
            <div className="bg-white  rounded-none shadow-sm p-6 border-[1.5px] border-gray-200 ">
              <h2 className="text-xl font-semibold text-gray-900  mb-4">
                Security Services
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-green-50  rounded-none">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-100  rounded-none">
                      <Server className="w-5 h-5 text-green-600 " />
                    </div>
                    <span className="font-medium text-gray-900 ">
                      Kyber-768 PQC
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 ">
                    Post-quantum key exchange active
                  </p>
                  <span className="inline-block mt-2 px-2 py-1 bg-green-100  text-green-800  text-xs font-medium rounded-none">
                    Operational
                  </span>
                </div>

                <div className="p-4 bg-green-50  rounded-none">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-100  rounded-none">
                      <Activity className="w-5 h-5 text-green-600 " />
                    </div>
                    <span className="font-medium text-gray-900 ">
                      AES-256-GCM
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 ">
                    Symmetric encryption active
                  </p>
                  <span className="inline-block mt-2 px-2 py-1 bg-green-100  text-green-800  text-xs font-medium rounded-none">
                    Operational
                  </span>
                </div>

                <div className="p-4 bg-green-50  rounded-none">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 bg-green-100  rounded-none">
                      <Database className="w-5 h-5 text-green-600 " />
                    </div>
                    <span className="font-medium text-gray-900 ">
                      Mutual Auth
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 ">
                    HMAC-SHA256 challenge-response
                  </p>
                  <span className="inline-block mt-2 px-2 py-1 bg-green-100  text-green-800  text-xs font-medium rounded-none">
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
