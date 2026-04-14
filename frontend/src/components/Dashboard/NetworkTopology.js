"use client";

import { useState, useEffect, useCallback } from "react";
import useAuthStore from "@/store/useAuthStore";
import { io } from "socket.io-client";

function getRelativeTime(date) {
  if (!date) return "N/A";
  const seconds = Math.floor((new Date() - new Date(date)) / 1000);
  if (seconds < 60) return `${Math.floor(seconds)} seconds ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hours ago`;
  const days = Math.floor(hours / 24);
  return `${days} days ago`;
}

function getSignalLabel(rssi) {
  if (rssi == null) return "";
  if (rssi > -50) return "Excellent";
  if (rssi > -65) return "Good";
  if (rssi > -80) return "Fair";
  return "Poor";
}

export default function NetworkTopology() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);

  const orgId = user?.organizationId || user?.id;

  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "";

  const fetchTopology = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/devices/topology/${orgId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
        setLastRefresh(new Date());
      } else {
        throw new Error("Failed to fetch topology");
      }
    } catch (err) {
      console.error("[Topology] Fetch error:", err);
      setError("Failed to load topology");
    } finally {
      setLoading(false);
    }
  }, [orgId, token, BACKEND_URL]);

  useEffect(() => {
    fetchTopology();
    // Auto-refresh every 10 seconds
    const interval = setInterval(fetchTopology, 10000);

    // Also listen for real-time topology updates via socket
    const socket = io(BACKEND_URL, {
      transports: ["websocket", "polling"],
    });
    socket.on("topology:update", (data) => {
      if (data && data.devices) {
        setDevices(data.devices);
        setLastRefresh(new Date());
      }
    });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, [fetchTopology, BACKEND_URL]);

  const getNodeColor = (device) => {
    if (device.status === "offline") return "#6b7280";
    if (device.status === "pending") return "#eab308";
    const timeSince = Date.now() - new Date(device.lastSeen).getTime();
    if (timeSince > 60000) return "#eab308"; // stale after 60s
    return "#22c55e";
  };

  const getStatusLabel = (device) => {
    if (device.status === "offline") return "Offline";
    if (device.status === "pending") return "Pending";
    const timeSince = Date.now() - new Date(device.lastSeen).getTime();
    if (timeSince > 60000) return "Stale";
    return "Online";
  };

  // Direct connection layout: all devices connect directly to server (star topology)
  const buildLayout = () => {
    const cx = 350;
    const cy = 80;
    const positions = {};

    if (devices.length === 0) return { positions, cx, cy };

    const radius = Math.min(180, 60 + devices.length * 20);

    devices.forEach((d, i) => {
      const angleSpread = Math.PI * 0.8; // 144 degrees spread
      const startAngle = Math.PI / 2 - angleSpread / 2; // centered below server
      let angle;
      if (devices.length === 1) {
        angle = Math.PI / 2; // straight down
      } else {
        angle = startAngle + (i * angleSpread) / (devices.length - 1);
      }
      positions[d.mac] = {
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius,
      };
    });

    return { positions, cx, cy };
  };

  const { positions, cx, cy } = buildLayout();

  const handleSvgClick = (e) => {
    if (e.target.tagName === "svg") {
      setSelectedNode(null);
    }
  };

  return (
    <div className="bg-white rounded-none shadow-sm border-[1.5px] border-gray-200 p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Network Topology</h2>
          <p className="text-gray-600 text-sm">
            Live real-time device map — direct connections
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-gray-400">
              Updated {getRelativeTime(lastRefresh)}
            </span>
          )}
          <button
            onClick={fetchTopology}
            className="px-3 py-1.5 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-none border border-gray-300 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="relative border border-gray-100 bg-gray-50 rounded-none overflow-hidden flex items-center justify-center min-h-[350px]">
        {loading ? (
          <div className="text-gray-500 font-medium">Loading topology...</div>
        ) : error ? (
          <div className="text-center">
            <div className="text-red-500 font-medium mb-3">{error}</div>
            <button
              onClick={fetchTopology}
              className="px-4 py-2 bg-indigo-600 text-white rounded-none hover:bg-indigo-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : devices.length === 0 ? (
          <div className="text-center">
            <p className="text-gray-400 text-4xl mb-2">📡</p>
            <p className="text-gray-500 font-medium">No devices connected</p>
            <p className="text-gray-400 text-sm">
              Provision a device to see it here
            </p>
          </div>
        ) : (
          <svg
            width="100%"
            height="350"
            viewBox="0 0 700 350"
            className="w-full h-auto max-h-[400px]"
            onClick={handleSvgClick}
          >
            {/* Draw Edges — all devices connect to server */}
            {devices.map((d) => {
              const pos = positions[d.mac];
              if (!pos) return null;
              const color = getNodeColor(d);
              return (
                <line
                  key={`edge-${d.mac}`}
                  x1={cx}
                  y1={cy}
                  x2={pos.x}
                  y2={pos.y}
                  stroke={color}
                  strokeWidth="2"
                  opacity="0.4"
                  strokeDasharray={d.status === "offline" ? "6,4" : "none"}
                />
              );
            })}

            {/* Central Server */}
            <rect
              x={cx - 30}
              y={cy - 20}
              width="60"
              height="40"
              fill="#111827"
            />
            <text
              x={cx}
              y={cy + 4}
              textAnchor="middle"
              fill="#ffffff"
              fontSize="11"
              fontWeight="700"
            >
              SERVER
            </text>

            {/* Draw Nodes */}
            {devices.map((d) => {
              const pos = positions[d.mac];
              if (!pos) return null;

              const color = getNodeColor(d);
              const isSelected = selectedNode?.mac === d.mac;
              const displayName = d.name
                ? d.name.length > 12
                  ? d.name.substring(0, 12) + "…"
                  : d.name
                : "Unknown";
              const shortMac = d.mac ? d.mac.slice(-8) : "N/A";

              return (
                <g
                  key={d.mac}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedNode(selectedNode?.mac === d.mac ? null : d);
                  }}
                  className="cursor-pointer"
                >
                  {/* Selection Highlight */}
                  {isSelected && (
                    <rect
                      x={pos.x - 26}
                      y={pos.y - 18}
                      width="52"
                      height="36"
                      fill="none"
                      stroke="#6366f1"
                      strokeWidth="2"
                    />
                  )}

                  {/* Node Rectangle */}
                  <rect
                    x={pos.x - 22}
                    y={pos.y - 14}
                    width="44"
                    height="28"
                    fill={color}
                  />

                  {/* Status dot */}
                  <circle
                    cx={pos.x + 16}
                    cy={pos.y - 8}
                    r="4"
                    fill={d.status === "online" ? "#fff" : "#374151"}
                    opacity="0.8"
                  />

                  {/* Connection Type Pill */}
                  <rect
                    x={pos.x - 18}
                    y={pos.y - 28}
                    width="36"
                    height="12"
                    fill="#1f2937"
                  />
                  <text
                    x={pos.x}
                    y={pos.y - 20}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="8"
                    fontWeight="600"
                    pointerEvents="none"
                  >
                    {d.connectionType || "direct"}
                  </text>

                  {/* Labels Below */}
                  <text
                    x={pos.x}
                    y={pos.y + 26}
                    textAnchor="middle"
                    fill="#374151"
                    fontSize="11"
                    fontWeight="600"
                    pointerEvents="none"
                  >
                    {displayName}
                  </text>
                  <text
                    x={pos.x}
                    y={pos.y + 38}
                    textAnchor="middle"
                    fill="#6b7280"
                    fontSize="9"
                    pointerEvents="none"
                  >
                    {shortMac}
                  </text>
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* Legend */}
      {devices.length > 0 && (
        <div className="flex items-center gap-6 mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-none" />
            <span className="text-xs text-gray-600">Online</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-none" />
            <span className="text-xs text-gray-600">Stale/Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-500 rounded-none" />
            <span className="text-xs text-gray-600">Offline</span>
          </div>
          <div className="ml-auto text-xs text-gray-400">
            {devices.length} device{devices.length !== 1 ? "s" : ""} •{" "}
            {devices.filter((d) => d.status === "online").length} online
          </div>
        </div>
      )}

      {/* Info Panel */}
      {selectedNode && (
        <div className="mt-6 p-5 bg-white border-[1.5px] border-gray-200 rounded-none shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">Device Details</h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-gray-400 hover:text-gray-700 transition-colors text-xl font-bold"
            >
              ×
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-4 gap-x-6 text-sm">
            <div>
              <p className="text-gray-500 font-medium mb-1">Name</p>
              <p className="font-semibold text-gray-900">
                {selectedNode.name || "Unknown"}
              </p>
            </div>
            <div>
              <p className="text-gray-500 font-medium mb-1">MAC Address</p>
              <p className="font-semibold text-gray-900 font-mono text-xs">
                {selectedNode.mac}
              </p>
            </div>
            <div>
              <p className="text-gray-500 font-medium mb-1">Status</p>
              <p
                className={`font-semibold capitalize ${
                  selectedNode.status === "online"
                    ? "text-green-600"
                    : selectedNode.status === "pending"
                      ? "text-yellow-600"
                      : "text-gray-600"
                }`}
              >
                {getStatusLabel(selectedNode)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 font-medium mb-1">Connection</p>
              <p className="font-semibold text-gray-900 capitalize">
                {selectedNode.connectionType || "direct"}
              </p>
            </div>
            <div>
              <p className="text-gray-500 font-medium mb-1">Last Seen</p>
              <p className="font-semibold text-gray-900">
                {getRelativeTime(selectedNode.lastSeen)}
              </p>
            </div>
            <div>
              <p className="text-gray-500 font-medium mb-1">IP Address</p>
              <p className="font-semibold text-gray-900 font-mono text-xs">
                {selectedNode.ipAddress || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-gray-500 font-medium mb-1">Authenticated</p>
              <p
                className={`font-semibold ${selectedNode.authenticated ? "text-green-600" : "text-gray-400"}`}
              >
                {selectedNode.authenticated ? "Yes" : "No"}
              </p>
            </div>
            <div>
              <p className="text-gray-500 font-medium mb-1">Signal (RSSI)</p>
              <p className="font-semibold text-gray-900">
                {selectedNode.rssi != null
                  ? `${selectedNode.rssi} dBm (${getSignalLabel(selectedNode.rssi)})`
                  : "N/A"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
