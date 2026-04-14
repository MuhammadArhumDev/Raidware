"use client";

import { useEffect, useState, useMemo } from "react";
import useDeviceStore from "@/store/useDeviceStore";
import useAuthStore from "@/store/useAuthStore";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import StatsCard from "@/components/Dashboard/StatsCard";
import MetricChart from "@/components/Dashboard/MetricChart";
import { Network, Activity, Shield, Wifi, Server } from "lucide-react";
import TopologyView from "@/components/Dashboard/TopologyView";
import MessageSender from "@/components/Dashboard/MessageSender";

export default function DashboardPage() {
  const { nodes, alerts, logs, startRealtime, stopRealtime } = useDeviceStore();
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const [networkHealth, setNetworkHealth] = useState(0);
  const [networkHealthHistory, setNetworkHealthHistory] = useState([]);
  const [nodeCountHistory, setNodeCountHistory] = useState([]);

  const orgId = user?.organizationId || user?.id;

  // Start real-time updates (socket + polling)
  useEffect(() => {
    if (orgId && token) {
      startRealtime(orgId, token);
    }
    return () => stopRealtime();
  }, [orgId, token, startRealtime, stopRealtime]);

  // Compute stats
  const nodeCount = Object.keys(nodes).length;
  const onlineNodes = Object.values(nodes).filter(
    (node) => node.status === "online",
  ).length;

  useEffect(() => {
    const health = nodeCount === 0 ? 0 : (onlineNodes / nodeCount) * 100;
    setNetworkHealth(health);

    const now = Date.now();
    setNetworkHealthHistory((prev) => {
      const newHistory = [...prev, { timestamp: now, value: health }];
      return newHistory.slice(-30);
    });
    setNodeCountHistory((prev) => {
      const newHistory = [...prev, { timestamp: now, value: nodeCount }];
      return newHistory.slice(-30);
    });
  }, [nodeCount, onlineNodes]);

  // Recent logs for the dashboard
  const recentLogs = logs.slice(0, 8);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Dashboard Overview
          </h1>
          <p className="text-gray-600">
            Cloud platform for secure IoT network management with sensors and
            IDS protection
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            icon={Network}
            title="Total Nodes"
            value={nodeCount}
            color="indigo"
          />
          <StatsCard
            icon={Wifi}
            title="Online Nodes"
            value={onlineNodes}
            color="green"
          />
          <StatsCard
            icon={Activity}
            title="Network Health"
            value={`${networkHealth.toFixed(1)}%`}
            color="blue"
          />
          <StatsCard
            icon={Shield}
            title="Network Logs"
            value={logs.length}
            color="red"
          />
        </div>

        {/* Topology + Health Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TopologyView nodes={nodes} />
          <MetricChart
            title="Network Health Trend"
            dataSource={networkHealthHistory}
            dataKey="value"
            color="green"
            type="area"
            height={280}
            unit="%"
            gradient={true}
          />
        </div>

        {/* Recent Network Logs */}
        <div className="bg-white rounded-none shadow-sm border-[1.5px] border-gray-200">
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Recent Network Logs
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Live IDS-analyzed device traffic — updates in real-time via
                WebSocket
              </p>
            </div>
            <a
              href="/dashboard/logs"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
            >
              View All →
            </a>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Device</th>
                  <th className="px-4 py-3">Src IP</th>
                  <th className="px-4 py-3">Protocol</th>
                  <th className="px-4 py-3">Dst Port</th>
                  <th className="px-4 py-3">Prediction</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {recentLogs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-8 text-center text-gray-400"
                    >
                      No network logs yet. Waiting for device traffic...
                    </td>
                  </tr>
                ) : (
                  recentLogs.map((log, idx) => {
                    const timeStr = log.timestamp
                      ? new Date(log.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })
                      : "—";
                    const actionClass =
                      log.action === "BLOCK"
                        ? "bg-red-100 text-red-700"
                        : log.action === "FLAG"
                          ? "bg-yellow-100 text-yellow-700"
                          : "bg-green-100 text-green-700";
                    const rowClass =
                      log.action === "BLOCK"
                        ? "bg-red-50"
                        : log.action === "FLAG"
                          ? "bg-yellow-50"
                          : "bg-white";

                    return (
                      <tr
                        key={log.id || log._id || idx}
                        className={`${rowClass} border-b border-gray-100 hover:bg-gray-50`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                          {timeStr}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {log.deviceName || "Unknown"}
                        </td>
                        <td className="px-4 py-3 text-gray-600 font-mono text-xs">
                          {log.srcIp}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {log.protocol}
                        </td>
                        <td className="px-4 py-3 text-gray-600">
                          {log.dstPort}
                        </td>
                        <td className="px-4 py-3 text-gray-900">
                          {log.prediction || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-none text-xs font-medium ${actionClass}`}
                          >
                            {log.action}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Node Count Chart + Messaging */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MetricChart
            title="Active Nodes Count"
            dataSource={nodeCountHistory}
            dataKey="value"
            color="indigo"
            type="line"
            height={250}
            unit=" nodes"
          />
          <MessageSender />
        </div>

        {/* System Status & Security */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-none shadow-sm p-6 border-[1.5px] border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              System Status
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-linear-to-r from-green-50 to-green-100 rounded-none border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-600 rounded-none">
                    <Wifi className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">IoT Network</p>
                    <p className="text-xs text-gray-600">
                      {onlineNodes}/{nodeCount} nodes online
                    </p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-none text-sm font-medium ${onlineNodes > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}
                >
                  {onlineNodes > 0 ? "Operational" : "Offline"}
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-linear-to-r from-green-50 to-green-100 rounded-none border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-600 rounded-none">
                    <Server className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Gateway Connection
                    </p>
                    <p className="text-xs text-gray-600">
                      Direct HTTPS connection
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-none text-sm font-medium">
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-linear-to-r from-blue-50 to-blue-100 rounded-none border border-blue-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-none">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Data Sync</p>
                    <p className="text-xs text-gray-600">
                      Real-time via WebSocket
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-none text-sm font-medium">
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-linear-to-r from-yellow-50 to-yellow-100 rounded-none border border-yellow-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-600 rounded-none">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      Intrusion Detection
                    </p>
                    <p className="text-xs text-gray-600">
                      IDS monitoring active
                    </p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-none text-sm font-medium">
                  Monitoring
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-none shadow-sm p-6 border-[1.5px] border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Security Status
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Encryption (Kyber-768)
                  </span>
                  <span className="text-sm font-semibold text-green-600">
                    Active
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-none h-2">
                  <div
                    className="bg-green-600 h-2 rounded-none"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700">
                    Online Devices
                  </span>
                  <span className="text-sm font-semibold text-indigo-600">
                    {onlineNodes} / {nodeCount}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-none h-2">
                  <div
                    className="bg-indigo-600 h-2 rounded-none"
                    style={{
                      width: `${(onlineNodes / (nodeCount || 1)) * 100}%`,
                    }}
                  />
                </div>
              </div>
              <div className="pt-4 border-t-[1.5px] border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Encryption Status
                  </span>
                  <span className="text-2xl font-bold text-green-600">
                    SECURE
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
