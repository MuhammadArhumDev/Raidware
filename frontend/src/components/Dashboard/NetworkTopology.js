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

  const orgId = user?.organizationId || user?.id;

  const fetchTopology = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/devices/topology/${orgId}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
      } else {
        throw new Error("Failed to fetch topology");
      }
    } catch (err) {
      console.error("[Topology] Fetch error:", err);
      setError("Failed to load topology");
    } finally {
      setLoading(false);
    }
  }, [orgId, token]);

  useEffect(() => {
    fetchTopology();

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
    const socket = io(backendUrl, {
      auth: { token },
      transports: ["websocket"],
    });

    socket.on("connect", () => {
      console.log("[Topology] Socket connected for live updates");
    });

    socket.on("topology:update", (data) => {
      if (data && data.devices) {
        setDevices(data.devices);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchTopology, token]);

  const getNodeColor = (device) => {
    if (device.status === "offline") return "#6b7280";
    const timeSince = Date.now() - new Date(device.lastSeen).getTime();
    if (timeSince > 30000) return "#eab308";
    return "#22c55e";
  };

  const buildLayout = () => {
    const cx = 350;
    const cy = 250;
    const positions = {};
    
    if (devices.length === 0) return { positions, cx, cy };

    let root = devices.find((d) => d.meshRole === "root");
    if (!root) root = devices[0];

    positions[root.mac] = { x: cx, y: cy };

    const children = devices.filter((d) => d.parentMac === root.mac);
    const ring1Radius = 160;

    children.forEach((child, i) => {
      const angle = (i * 2 * Math.PI) / children.length - Math.PI / 2;
      positions[child.mac] = {
        x: cx + Math.cos(angle) * ring1Radius,
        y: cy + Math.sin(angle) * ring1Radius,
        angle,
      };
    });

    const ring2Radius = 280;
    const allGrandchildren = devices.filter(
      (d) => d.mac !== root.mac && children.some((c) => c.mac === d.parentMac)
    );

    const gcByParent = {};
    allGrandchildren.forEach((gc) => {
      if (!gcByParent[gc.parentMac]) gcByParent[gc.parentMac] = [];
      gcByParent[gc.parentMac].push(gc);
    });

    for (const [parentMac, gcs] of Object.entries(gcByParent)) {
      const parentPos = positions[parentMac];
      const baseAngle = parentPos.angle;
      const angleSpread = Math.PI / 4;

      gcs.forEach((gc, i) => {
        let angleOffset = 0;
        if (gcs.length > 1) {
          angleOffset = -angleSpread / 2 + (angleSpread / (gcs.length - 1)) * i;
        }
        const finalAngle = baseAngle + angleOffset;
        positions[gc.mac] = {
          x: cx + Math.cos(finalAngle) * ring2Radius,
          y: cy + Math.sin(finalAngle) * ring2Radius,
        };
      });
    }

    const leftovers = devices.filter((d) => !positions[d.mac]);
    leftovers.forEach((d, i) => {
      const angle = (i * 2 * Math.PI) / leftovers.length;
      positions[d.mac] = {
        x: cx + Math.cos(angle) * 320,
        y: cy + Math.sin(angle) * 320,
      };
    });

    return { positions, cx, cy, rootMac: root.mac };
  };

  const { positions, cx, cy, rootMac } = buildLayout();

  const handleSvgClick = (e) => {
    if (e.target.tagName === "svg") {
      setSelectedNode(null);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Network Topology</h2>
        <p className="text-gray-600 text-sm">Live real-time mesh device map</p>
      </div>

      <div className="relative border border-gray-100 bg-gray-50 rounded-lg overflow-hidden flex items-center justify-center min-h-[500px]">
        {loading ? (
          <div className="text-gray-500 font-medium">Loading topology...</div>
        ) : error ? (
          <div className="text-center">
            <div className="text-red-500 font-medium mb-3">{error}</div>
            <button
              onClick={fetchTopology}
              className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : devices.length === 0 ? (
          <div className="text-gray-500 font-medium">No devices connected</div>
        ) : (
          <svg
            width="100%"
            height="500"
            viewBox="0 0 700 500"
            className="w-full h-auto max-h-[600px]"
            onClick={handleSvgClick}
          >
            <defs>
              <filter id="drop-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.2" />
              </filter>
            </defs>

            {/* Draw Edges */}
            {devices.map((d) => {
              if (d.parentMac && positions[d.mac] && positions[d.parentMac]) {
                const from = positions[d.parentMac];
                const to = positions[d.mac];
                return (
                  <line
                    key={`edge-${d.mac}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="#374151"
                    strokeWidth="1.5"
                    opacity="0.5"
                  />
                );
              }
              return null;
            })}

            {/* Draw Nodes */}
            {devices.map((d) => {
              const pos = positions[d.mac];
              if (!pos) return null;
              
              const isRoot = d.mac === rootMac;
              const radius = isRoot ? 36 : 28;
              const color = getNodeColor(d);
              const isSelected = selectedNode?.mac === d.mac;
              
              const displayName = d.name ? (d.name.length > 10 ? d.name.substring(0, 10) + "..." : d.name) : "Unknown";
              const shortMac = d.mac ? d.mac.slice(-6) : "N/A";

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
                    <circle cx={pos.x} cy={pos.y} r={radius + 4} fill="none" stroke="#6366f1" strokeWidth="2" />
                  )}

                  {/* Main Circle */}
                  <circle
                    cx={pos.x}
                    cy={pos.y}
                    r={radius}
                    fill={color}
                    filter="url(#drop-shadow)"
                  />

                  {/* Role Pill Above */}
                  <rect 
                    x={pos.x - 20} 
                    y={pos.y - radius - 14} 
                    width="40" 
                    height="16" 
                    rx="8" 
                    fill="#1f2937" 
                  />
                  <text
                    x={pos.x}
                    y={pos.y - radius - 6}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="9"
                    fontWeight="600"
                    pointerEvents="none"
                  >
                    {d.meshRole || "node"}
                  </text>

                  {/* Labels Below */}
                  <text
                    x={pos.x}
                    y={pos.y + radius + 16}
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
                    y={pos.y + radius + 28}
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

      {/* Info Panel */}
      {selectedNode && (
        <div className="mt-6 p-5 bg-white border border-gray-200 rounded-lg shadow-sm">
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
              <p className="font-semibold text-gray-900">{selectedNode.name || "Unknown"}</p>
            </div>
            <div>
              <p className="text-gray-500 font-medium mb-1">MAC Address</p>
              <p className="font-semibold text-gray-900">{selectedNode.mac}</p>
            </div>
            <div>
              <p className="text-gray-500 font-medium mb-1">Status</p>
              <p className="font-semibold text-gray-900 capitalize">{selectedNode.status}</p>
            </div>
            <div>
              <p className="text-gray-500 font-medium mb-1">Mesh Role</p>
              <p className="font-semibold text-gray-900 capitalize">{selectedNode.meshRole || "node"}</p>
            </div>
            <div>
              <p className="text-gray-500 font-medium mb-1">Last Seen</p>
              <p className="font-semibold text-gray-900">{getRelativeTime(selectedNode.lastSeen)}</p>
            </div>
            <div>
              <p className="text-gray-500 font-medium mb-1">IP Address</p>
              <p className="font-semibold text-gray-900">{selectedNode.ipAddress || "N/A"}</p>
            </div>
            <div className="col-span-2">
              <p className="text-gray-500 font-medium mb-1">Signal Strength (RSSI)</p>
              <p className="font-semibold text-gray-900">
                {selectedNode.rssi != null ? `${selectedNode.rssi} dBm (${getSignalLabel(selectedNode.rssi)})` : "N/A"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
