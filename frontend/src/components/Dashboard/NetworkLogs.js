"use client";

import { useState, useEffect, useCallback } from "react";
import useAuthStore from "@/store/useAuthStore";
import { io } from "socket.io-client";

export default function NetworkLogs() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [alertsOnly, setAlertsOnly] = useState(false);
  const [newLogIds, setNewLogIds] = useState(new Set());

  const orgId = user?.organizationId || user?.id;

  const fetchLogs = useCallback(async (isAlertsOnly) => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const url = isAlertsOnly
        ? `/api/devices/logs/${orgId}/alerts?limit=50`
        : `/api/devices/logs/${orgId}?limit=50`;
      const res = await fetch(process.env.NEXT_PUBLIC_BACKEND_URL + url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      } else {
        throw new Error("Failed to fetch logs");
      }
    } catch (err) {
      console.error("[NetworkLogs] Fetch error:", err);
      setError("Failed to load network logs");
    } finally {
      setLoading(false);
    }
  }, [orgId, token]);

  useEffect(() => {
    fetchLogs(alertsOnly);
  }, [fetchLogs, alertsOnly]);

  useEffect(() => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
    const socket = io(backendUrl, {
      auth: { token },
      transports: ["websocket"],
    });

    socket.on("network:log:new", (data) => {
      if (data && data.log) {
        if (alertsOnly && !['BLOCK', 'FLAG'].includes(data.log.action)) {
          return;
        }

        setLogs((prev) => {
          const newLogs = [data.log, ...prev].slice(0, 100);
          return newLogs;
        });

        setNewLogIds((prev) => {
          const updated = new Set(prev);
          updated.add(data.log.id);
          return updated;
        });

        setTimeout(() => {
          setNewLogIds((prev) => {
            const updated = new Set(prev);
            updated.delete(data.log.id);
            return updated;
          });
        }, 2000);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [token, alertsOnly]);

  const handleFilterChange = (isAlerts) => {
    if (alertsOnly !== isAlerts) {
      setAlertsOnly(isAlerts);
    }
  };

  const getRowClass = (log) => {
    const isNew = newLogIds.has(log.id);
    let baseClass = "transition-colors duration-500 ";
    
    if (isNew) {
      baseClass += "bg-blue-100 ";
    } else if (log.action === "BLOCK") {
      baseClass += "bg-red-50 ";
    } else if (log.action === "FLAG") {
      baseClass += "bg-yellow-50 ";
    } else {
      baseClass += "bg-white ";
    }
    return baseClass + "border-b border-gray-100 hover:bg-gray-50";
  };

  const getBadgeClass = (action) => {
    switch (action) {
      case "BLOCK":
        return "bg-red-100 text-red-700";
      case "FLAG":
        return "bg-yellow-100 text-yellow-700";
      case "ALLOW":
      default:
        return "bg-green-100 text-green-700";
    }
  };

  const totalLogs = logs.length;
  const blockedCount = logs.filter(l => l.action === "BLOCK").length;
  const flaggedCount = logs.filter(l => l.action === "FLAG").length;
  const cleanCount = logs.filter(l => l.action === "ALLOW").length;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Network Logs</h2>
          <p className="text-gray-600 text-sm">Live IDS-analyzed device traffic</p>
        </div>
        <div className="mt-4 sm:mt-0 flex gap-2">
          <button
            onClick={() => handleFilterChange(false)}
            className={`px-4 py-2 text-sm font-medium rounded-md border ${
              !alertsOnly
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            All Logs
          </button>
          <button
            onClick={() => handleFilterChange(true)}
            className={`px-4 py-2 text-sm font-medium rounded-md border ${
              alertsOnly
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            Alerts Only
          </button>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 text-center">
          <p className="text-gray-500 text-xs font-medium mb-1">Total Logs</p>
          <p className="text-xl font-bold text-gray-900">{totalLogs}</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4 border border-red-100 text-center">
          <p className="text-red-500 text-xs font-medium mb-1">Blocked</p>
          <p className="text-xl font-bold text-red-700">{blockedCount}</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-100 text-center">
          <p className="text-yellow-600 text-xs font-medium mb-1">Flagged</p>
          <p className="text-xl font-bold text-yellow-700">{flaggedCount}</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 border border-green-100 text-center">
          <p className="text-green-600 text-xs font-medium mb-1">Clean</p>
          <p className="text-xl font-bold text-green-700">{cleanCount}</p>
        </div>
      </div>

      {loading ? (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Device</th>
                <th className="px-4 py-3">Src IP</th>
                <th className="px-4 py-3">Dst Port</th>
                <th className="px-4 py-3">Protocol</th>
                <th className="px-4 py-3">Prediction</th>
                <th className="px-4 py-3">Confidence</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-gray-100 bg-white">
                  <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-10 animate-pulse"></div></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div></td>
                  <td className="px-4 py-3"><div className="h-4 bg-gray-200 rounded w-12 animate-pulse"></div></td>
                  <td className="px-4 py-3"><div className="h-5 bg-gray-200 rounded w-16 animate-pulse"></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : error ? (
        <div className="text-center py-10">
          <p className="text-red-500 font-medium mb-4">{error}</p>
          <button
            onClick={() => fetchLogs(alertsOnly)}
            className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : logs.length === 0 ? (
        <div className="flex justify-center items-center py-20">
          <span className="text-gray-500 font-medium">
            No logs yet — waiting for devices to connect
          </span>
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200 rounded-lg">
          <div className="max-h-96 overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Device</th>
                  <th className="px-4 py-3">Src IP</th>
                  <th className="px-4 py-3">Dst Port</th>
                  <th className="px-4 py-3">Protocol</th>
                  <th className="px-4 py-3">Prediction</th>
                  <th className="px-4 py-3">Confidence</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const timeStr = new Date(log.timestamp).toLocaleTimeString([], {
                    hour: '2-digit', minute: '2-digit', second: '2-digit'
                  });
                  const devName = log.deviceName?.length > 12 
                    ? log.deviceName.substring(0, 12) + "..." 
                    : (log.deviceName || "Unknown");
                  const predStr = log.prediction?.length > 14
                    ? log.prediction.substring(0, 14) + "..."
                    : log.prediction;
                  const confPct = log.confidence ? (log.confidence * 100).toFixed(1) + "%" : "";

                  return (
                    <tr key={log.id || Math.random().toString()} className={getRowClass(log)}>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">{timeStr}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{devName}</td>
                      <td className="px-4 py-3 text-gray-600">{log.srcIp}</td>
                      <td className="px-4 py-3 text-gray-600">{log.dstPort}</td>
                      <td className="px-4 py-3 text-gray-600">{log.protocol}</td>
                      <td className="px-4 py-3 text-gray-900">{predStr}</td>
                      <td className="px-4 py-3 text-gray-600">{confPct}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-medium ${getBadgeClass(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
