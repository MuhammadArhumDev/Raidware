"use client";

import { useState, useEffect, useCallback } from "react";
import useAuthStore from "@/store/useAuthStore";
import useDeviceStore from "@/store/useDeviceStore";
import { io } from "socket.io-client";
import { RefreshCw, Zap, Database } from "lucide-react";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
const TYPE_OPTIONS = [
  "all","BENIGN","DoS Hulk","DoS GoldenEye","DoS Slowloris",
  "DoS Slowhttptest","DDoS","PortScan","Brute Force",
  "Web Attack","Botnet","Heartbleed",
];

export default function NetworkLogs() {
  const user      = useAuthStore((state) => state.user);
  const token     = useAuthStore((state) => state.token);
  const nodes     = useDeviceStore((state) => state.nodes);

  const [logs,          setLogs]          = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [alertsOnly,    setAlertsOnly]    = useState(false);
  const [newLogIds,     setNewLogIds]     = useState(new Set());
  const [selectedDevice,setSelectedDevice]= useState("all");
  const [selectedType,  setSelectedType]  = useState("all");
  const [lastRefresh,   setLastRefresh]   = useState(null);
  const [redisCount,    setRedisCount]    = useState(0);

  const orgId = user?.organizationId || user?.id;

  // ── Merge helper: dedup by id, newest first ─────────────────────────────
  const mergeLogs = (a, b) => {
    const seen = new Set();
    return [...a, ...b]
      .sort((x, y) => new Date(y.timestamp) - new Date(x.timestamp))
      .filter((l) => {
        const key = l.id || l._id || l.timestamp;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 300);
  };

  // ── Fetch MongoDB org-wide history ───────────────────────────────────────
  const fetchMongoLogs = useCallback(async (isAlertsOnly) => {
    if (!orgId || !token) return [];
    const url = isAlertsOnly
      ? `${BACKEND_URL}/api/devices/logs/${orgId}/alerts?limit=100`
      : `${BACKEND_URL}/api/devices/logs/${orgId}?limit=100`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.logs || []).map((l) => ({ ...l, _source: "db" }));
  }, [orgId, token]);

  // ── Fetch Redis per-device buffer ────────────────────────────────────────
  const fetchRedisLogs = useCallback(async () => {
    const macs = Object.keys(nodes);
    if (!macs.length || !token) return [];
    const results = await Promise.all(
      macs.map((mac) =>
        fetch(
          `${BACKEND_URL}/api/devices/device-provisioning/netlogs/${mac}?limit=50`,
          { headers: { Authorization: `Bearer ${token}` } }
        ).then((r) => (r.ok ? r.json() : { logs: [] }))
      )
    );
    const combined = results
      .flatMap((r) => r.logs || [])
      .map((l) => ({ ...l, _source: "redis" }));
    setRedisCount(combined.length);
    return combined;
  }, [nodes, token]);

  // ── Master load: Redis + MongoDB merged ──────────────────────────────────
  const loadAll = useCallback(async (isAlertsOnly) => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const [mongo, redis] = await Promise.all([
        fetchMongoLogs(isAlertsOnly),
        fetchRedisLogs(),
      ]);
      setLogs(mergeLogs(redis, mongo));
      setLastRefresh(new Date());
    } catch (err) {
      console.error("[NetworkLogs] load error:", err);
      setError("Failed to load network logs");
    } finally {
      setLoading(false);
    }
  }, [orgId, fetchMongoLogs, fetchRedisLogs]);

  // Initial load + re-load when alertsOnly changes
  useEffect(() => { loadAll(alertsOnly); }, [loadAll, alertsOnly]);

  // ── WebSocket: live new logs ─────────────────────────────────────────────
  useEffect(() => {
    const socket = io(BACKEND_URL, { auth: { token }, transports: ["websocket"] });

    socket.on("network:log:new", (data) => {
      if (!data?.log) return;
      const log = { ...data.log, _source: "redis" };
      if (alertsOnly && !["BLOCK","FLAG"].includes(log.action)) return;

      setLogs((prev) => mergeLogs([log], prev));
      setRedisCount((c) => c + 1);

      // Flash animation
      const id = log.id || log._id;
      setNewLogIds((prev) => new Set(prev).add(id));
      setTimeout(() => {
        setNewLogIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
      }, 2000);
    });

    return () => socket.disconnect();
  }, [token, alertsOnly]);

  // ── Derived state ────────────────────────────────────────────────────────
  const deviceOptions = ["all", ...new Set(logs.map((l) => l.deviceName).filter(Boolean))];

  const filteredLogs = logs.filter((log) => {
    const deviceMatch = selectedDevice === "all" || log.deviceName === selectedDevice;
    const typeMatch   = selectedType   === "all" || log.prediction  === selectedType;
    const alertMatch  = !alertsOnly || ["BLOCK","FLAG"].includes(log.action);
    return deviceMatch && typeMatch && alertMatch;
  });

  const blockedCount = filteredLogs.filter((l) => l.action === "BLOCK").length;
  const flaggedCount = filteredLogs.filter((l) => l.action === "FLAG").length;
  const cleanCount   = filteredLogs.filter((l) => l.action === "ALLOW").length;

  // ── Style helpers ────────────────────────────────────────────────────────
  const getRowClass = (log) => {
    const isNew = newLogIds.has(log.id || log._id);
    const base  = "transition-colors duration-500 border-b border-gray-100 hover:bg-gray-50 ";
    if (isNew)               return base + "bg-blue-50";
    if (log.action === "BLOCK") return base + "bg-red-50";
    if (log.action === "FLAG")  return base + "bg-yellow-50";
    return base + "bg-white";
  };

  const getBadge = (action) => {
    if (action === "BLOCK") return "bg-red-100 text-red-700";
    if (action === "FLAG")  return "bg-yellow-100 text-yellow-700";
    return "bg-green-100 text-green-700";
  };

  return (
    <div className="bg-white rounded-none shadow-sm border-[1.5px] border-gray-200 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Network Logs</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Live IDS-analyzed device traffic — Redis buffer (30 min) + MongoDB history
          </p>
          {lastRefresh && (
            <p className="text-xs text-gray-400 mt-1">
              Last refreshed: {lastRefresh.toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Source legend */}
          <div className="flex items-center gap-1 text-xs text-gray-500 mr-2">
            <Zap className="w-3 h-3 text-indigo-500" />
            <span>Redis live</span>
            <Database className="w-3 h-3 text-gray-400 ml-2" />
            <span>MongoDB</span>
          </div>
          <button
            onClick={() => loadAll(alertsOnly)}
            className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-none border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={() => { setAlertsOnly(false); setSelectedDevice("all"); setSelectedType("all"); }}
            className={`px-4 py-2 text-sm font-medium rounded-none border ${
              !alertsOnly ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            All Logs
          </button>
          <button
            onClick={() => { setAlertsOnly(true); setSelectedDevice("all"); setSelectedType("all"); }}
            className={`px-4 py-2 text-sm font-medium rounded-none border ${
              alertsOnly ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
            }`}
          >
            Alerts Only
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-50 p-4 border border-gray-100 text-center">
          <p className="text-gray-500 text-xs font-medium mb-1">Total</p>
          <p className="text-xl font-bold text-gray-900">{filteredLogs.length}</p>
          <p className="text-xs text-indigo-500 mt-0.5">{redisCount} from Redis</p>
        </div>
        <div className="bg-red-50 p-4 border border-red-100 text-center">
          <p className="text-red-500 text-xs font-medium mb-1">Blocked</p>
          <p className="text-xl font-bold text-red-700">{blockedCount}</p>
        </div>
        <div className="bg-yellow-50 p-4 border border-yellow-100 text-center">
          <p className="text-yellow-600 text-xs font-medium mb-1">Flagged</p>
          <p className="text-xl font-bold text-yellow-700">{flaggedCount}</p>
        </div>
        <div className="bg-green-50 p-4 border border-green-100 text-center">
          <p className="text-green-600 text-xs font-medium mb-1">Clean</p>
          <p className="text-xl font-bold text-green-700">{cleanCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-4 flex-wrap items-center">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Device:</label>
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="text-sm border border-gray-300 rounded-none px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {deviceOptions.map((d) => (
              <option key={d} value={d}>{d === "all" ? "All Devices" : d}</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-600">Type:</label>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-sm border border-gray-300 rounded-none px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t} value={t}>{t === "all" ? "All Types" : t}</option>
            ))}
          </select>
        </div>
        {(selectedDevice !== "all" || selectedType !== "all") && (
          <button
            onClick={() => { setSelectedDevice("all"); setSelectedType("all"); }}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium underline"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Table */}
      {loading ? (
        <div className="overflow-x-auto border border-gray-200">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 uppercase bg-gray-50">
              <tr>
                {["Source","Time","Device","Src IP","Dst Port","Protocol","Prediction","Confidence","Action"].map((h) => (
                  <th key={h} className="px-4 py-3">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(6)].map((_, i) => (
                <tr key={i} className="border-b border-gray-100 bg-white">
                  {[...Array(9)].map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-200 rounded-none animate-pulse w-16" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-gray-400 text-4xl">📡</p>
          <p className="text-gray-500 font-medium">Failed to load logs</p>
          <p className="text-gray-400 text-sm">{error}</p>
          <button onClick={() => loadAll(alertsOnly)} className="text-sm text-indigo-600 hover:underline">
            Retry
          </button>
        </div>
      ) : filteredLogs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <p className="text-gray-400 text-4xl">{logs.length === 0 ? "📡" : "🔍"}</p>
          <p className="text-gray-500 font-medium">
            {logs.length === 0 ? "No logs yet" : "No logs match the selected filters"}
          </p>
          <p className="text-gray-400 text-sm">
            {logs.length === 0
              ? "Waiting for devices to send network data..."
              : "Try adjusting your device or type filter"}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto border border-gray-200">
          <div className="max-h-[600px] overflow-y-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0 z-10 shadow-sm">
                <tr>
                  <th className="px-3 py-3">Source</th>
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
                {filteredLogs.map((log) => {
                  const timeStr = new Date(log.timestamp).toLocaleTimeString([], {
                    hour: "2-digit", minute: "2-digit", second: "2-digit",
                  });
                  const confPct = log.confidence ? (log.confidence * 100).toFixed(1) + "%" : "—";
                  const pred    = log.prediction?.length > 14
                    ? log.prediction.substring(0, 14) + "…"
                    : (log.prediction || "—");
                  const devName = log.deviceName?.length > 14
                    ? log.deviceName.substring(0, 14) + "…"
                    : (log.deviceName || "Unknown");
                  const isRedis = log._source === "redis";

                  return (
                    <tr key={log.id || log._id || `${log.timestamp}-${log.srcIp}`} className={getRowClass(log)}>
                      <td className="px-3 py-3">
                        <span title={isRedis ? "Redis buffer (live)" : "MongoDB history"}>
                          {isRedis
                            ? <Zap className="w-3.5 h-3.5 text-indigo-500" />
                            : <Database className="w-3.5 h-3.5 text-gray-400" />
                          }
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500 font-mono text-xs">{timeStr}</td>
                      <td className="px-4 py-3 font-medium text-gray-900">{devName}</td>
                      <td className="px-4 py-3 text-gray-600 font-mono text-xs">{log.srcIp}</td>
                      <td className="px-4 py-3 text-gray-600">{log.dstPort}</td>
                      <td className="px-4 py-3 text-gray-600">{log.protocol}</td>
                      <td className="px-4 py-3 text-gray-900">{pred}</td>
                      <td className="px-4 py-3 text-gray-600">{confPct}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-none text-xs font-medium ${getBadge(log.action)}`}>
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
