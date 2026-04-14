"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import useAuthStore from "@/store/useAuthStore";
import useDeviceStore from "@/store/useDeviceStore";
import { Wifi, WifiOff, Server, RefreshCw, Clock, Signal } from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────────
function getRelativeTime(date) {
  if (!date) return "—";
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 5)  return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

function nodeColor(device) {
  if (device.status === "online") {
    // Stale at 45s — gives a 15s yellow warning before the 60s liveness timer fires
    const stale = Date.now() - new Date(device.lastSeen).getTime() > 45_000;
    return stale ? "#eab308" : "#22c55e";
  }
  if (device.status === "pending") return "#eab308";
  return "#6b7280";
}

function signalLabel(rssi) {
  if (rssi == null) return "—";
  if (rssi > -50) return "Excellent";
  if (rssi > -65) return "Good";
  if (rssi > -80) return "Fair";
  return "Poor";
}

// ── SVG topology canvas ───────────────────────────────────────────────────────
function TopologySVG({ devices, selectedMac, onSelect }) {
  const W = 700;
  const H = 420;
  const cx = W / 2;
  const cy = 70;

  const positions = useMemo(() => {
    const map = {};
    if (!devices.length) return map;
    const radius = Math.min(200, 80 + devices.length * 22);
    const spread = Math.PI * 0.85;
    const start = Math.PI / 2 - spread / 2;
    devices.forEach((d, i) => {
      const angle =
        devices.length === 1
          ? Math.PI / 2
          : start + (i * spread) / (devices.length - 1);
      map[d.mac || d.id] = {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius + 40,
      };
    });
    return map;
  }, [devices, cx, cy]);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full h-auto"
      style={{ maxHeight: 420 }}
      onClick={(e) => e.target.tagName === "svg" && onSelect(null)}
    >
      {/* Edges */}
      {devices.map((d) => {
        const pos = positions[d.mac || d.id];
        if (!pos) return null;
        const online = d.status === "online";
        return (
          <line
            key={`e-${d.mac || d.id}`}
            x1={cx} y1={cy + 22}
            x2={pos.x} y2={pos.y - 16}
            stroke={online ? "rgba(34,197,94,0.4)" : "rgba(107,114,128,0.25)"}
            strokeWidth={online ? 2 : 1.5}
            strokeDasharray={online ? "none" : "6,4"}
          />
        );
      })}

      {/* Central server */}
      <rect x={cx - 36} y={cy - 22} width={72} height={44} fill="#111827" />
      <text x={cx} y={cy + 2} textAnchor="middle" fill="#fff" fontSize={11} fontWeight="700">SERVER</text>
      <text x={cx} y={cy + 15} textAnchor="middle" fill="#6b7280" fontSize={8}>Raidware Cloud</text>

      {/* Device nodes */}
      {devices.map((d) => {
        const pos = positions[d.mac || d.id];
        if (!pos) return null;
        const color = nodeColor(d);
        const selected = selectedMac === (d.mac || d.id);
        const label = d.name
          ? d.name.length > 12 ? d.name.slice(0, 12) + "…" : d.name
          : d.mac ? d.mac.slice(-8) : "???";

        return (
          <g
            key={d.mac || d.id}
            onClick={(e) => { e.stopPropagation(); onSelect(d.mac || d.id); }}
            className="cursor-pointer"
          >
            {/* Selection ring */}
            {selected && (
              <rect
                x={pos.x - 30} y={pos.y - 20}
                width={60} height={40}
                fill="none"
                stroke="#6366f1"
                strokeWidth={2}
              />
            )}
            {/* Node rect */}
            <rect x={pos.x - 26} y={pos.y - 16} width={52} height={32} fill={color} />

            {/* Status dot */}
            {d.status === "online" && (
              <circle cx={pos.x + 20} cy={pos.y - 12} r={4} fill="#fff" opacity={0.85} />
            )}

            {/* Connection type pill */}
            <rect x={pos.x - 20} y={pos.y - 32} width={40} height={13} fill="#1f2937" />
            <text x={pos.x} y={pos.y - 23} textAnchor="middle" fill="#9ca3af" fontSize={7} fontWeight="600">
              {d.connectionType || "direct"}
            </text>

            {/* Label */}
            <text x={pos.x} y={pos.y + 34} textAnchor="middle" fill="#374151" fontSize={10} fontWeight="600">
              {label}
            </text>
            <text x={pos.x} y={pos.y + 46} textAnchor="middle" fill="#9ca3af" fontSize={8}>
              {d.status}
            </text>
          </g>
        );
      })}

      {/* Empty state */}
      {devices.length === 0 && (
        <text x={W / 2} y={H / 2} textAnchor="middle" fill="#9ca3af" fontSize={14}>
          No devices connected — waiting for heartbeats…
        </text>
      )}
    </svg>
  );
}

// ── Device detail panel ───────────────────────────────────────────────────────
function DevicePanel({ device, onClose }) {
  if (!device) return null;
  const color = nodeColor(device);
  const isOnline = device.status === "online";

  return (
    <div className="border-[1.5px] border-indigo-200 bg-indigo-50 p-5 mt-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3" style={{ background: color }} />
          <h3 className="font-bold text-gray-900 text-lg">
            {device.name || "Unnamed Device"}
          </h3>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-700 text-xl font-bold leading-none">×</button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        {[
          { label: "Status",        value: device.status || "—",              icon: isOnline ? Wifi : WifiOff, color: isOnline ? "text-green-600" : "text-gray-500" },
          { label: "Last Seen",     value: getRelativeTime(device.lastSeen), icon: Clock },
          { label: "IP Address",   value: device.ipAddress || "—",           icon: Server },
          { label: "Signal (RSSI)", value: device.rssi != null ? `${device.rssi} dBm (${signalLabel(device.rssi)})` : "—", icon: Signal },
          { label: "MAC Address",  value: device.mac || "—" },
          { label: "Connection",   value: device.connectionType || "direct" },
          { label: "Authenticated",value: device.authenticated ? "Yes" : "No" },
          { label: "Type",         value: device.meshRole || "direct" },
        ].map(({ label, value, icon: Icon, color: c }) => (
          <div key={label}>
            <p className="text-gray-500 text-xs font-medium mb-1 flex items-center gap-1">
              {Icon && <Icon className="w-3 h-3" />}{label}
            </p>
            <p className={`font-semibold text-gray-900 font-mono text-xs break-all ${c || ""}`}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function NetworkTopologyPage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const { nodes, startRealtime, stopRealtime } = useDeviceStore();
  const [selectedMac, setSelectedMac] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const orgId = user?.organizationId || user?.id;

  useEffect(() => {
    if (orgId && token) {
      startRealtime(orgId, token);
      setLastRefresh(new Date());
    }
    return () => stopRealtime();
  }, [orgId, token, startRealtime, stopRealtime]);

  const devices     = useMemo(() => Object.values(nodes), [nodes]);
  const online      = devices.filter((d) => d.status === "online");
  const offline     = devices.filter((d) => d.status !== "online");
  const selectedDev = selectedMac ? nodes[selectedMac] : null;

  const handleRefresh = () => {
    if (orgId && token) startRealtime(orgId, token);
    setLastRefresh(new Date());
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Network Topology</h1>
            <p className="text-gray-500 text-sm mt-1">
              Live star topology — all active IoT devices connected directly to the cloud gateway
            </p>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-2 px-4 py-2 bg-white border-[1.5px] border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Devices",   value: devices.length, color: "indigo" },
            { label: "Online",          value: online.length,  color: "green"  },
            { label: "Offline",         value: offline.length, color: "gray"   },
            { label: "Network Health",  value: devices.length === 0 ? "—" : `${Math.round((online.length / devices.length) * 100)}%`, color: "blue" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white border-[1.5px] border-gray-200 p-4">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-1">{label}</p>
              <p className={`text-3xl font-bold text-${color}-600`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Topology canvas + device list */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* SVG topology — takes 2/3 width */}
          <div className="lg:col-span-2 bg-white border-[1.5px] border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Live Network Map</h2>
              <span className="text-xs text-gray-400">
                Updated {getRelativeTime(lastRefresh)}
              </span>
            </div>

            <div className="bg-gray-50 border border-gray-100 p-4">
              <TopologySVG
                devices={devices}
                selectedMac={selectedMac}
                onSelect={setSelectedMac}
              />
            </div>

            {/* Legend */}
            <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500" /><span className="text-xs text-gray-500">Online</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-yellow-500" /><span className="text-xs text-gray-500">Stale / Pending</span></div>
              <div className="flex items-center gap-2"><div className="w-3 h-3 bg-gray-500" /><span className="text-xs text-gray-500">Offline</span></div>
              <span className="ml-auto text-xs text-gray-400">Click a node for details</span>
            </div>

            {/* Device detail inline */}
            <DevicePanel device={selectedDev} onClose={() => setSelectedMac(null)} />
          </div>

          {/* Device list — 1/3 width */}
          <div className="bg-white border-[1.5px] border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              All Devices
              <span className="ml-2 text-sm text-gray-400 font-normal">{devices.length}</span>
            </h2>

            {devices.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Wifi className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No devices provisioned yet</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                {devices
                  .sort((a, b) => (b.status === "online" ? 1 : -1))
                  .map((d) => {
                    const mac = d.mac || d.id;
                    const isSelected = selectedMac === mac;
                    const isOnline = d.status === "online";
                    return (
                      <button
                        key={mac}
                        onClick={() => setSelectedMac(isSelected ? null : mac)}
                        className={`w-full text-left p-3 border transition-colors ${
                          isSelected
                            ? "border-indigo-300 bg-indigo-50"
                            : "border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-2.5 h-2.5 shrink-0"
                            style={{ background: nodeColor(d) }}
                          />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 text-sm truncate">
                              {d.name || "Unnamed"}
                            </p>
                            <p className="text-xs text-gray-400 font-mono truncate">
                              {mac}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className={`text-xs font-medium ${isOnline ? "text-green-600" : "text-gray-400"}`}>
                              {d.status}
                            </span>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {getRelativeTime(d.lastSeen)}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
