"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import useAuthStore from "@/store/useAuthStore";
import authFetch from "@/lib/authFetch";
import { io } from "socket.io-client";
import {
  Network,
  Wifi,
  Server,
  Activity,
  Shield,
  Signal,
  MapPin,
} from "lucide-react";

const SOCKET_URL = "http://5.189.167.55:9631";

export default function NetworkTopology() {
  const user = useAuthStore((state) => state.user);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState(null);
  const [viewMode, setViewMode] = useState("topology"); // 'topology' or 'list'
  const socketRef = useRef(null);

  // Get orgId from user context (organization users) or null (admin sees all)
  const orgId = user?.organizationId || user?.id;

  // Fetch initial topology via REST API
  const fetchTopology = useCallback(async () => {
    if (!orgId) return;
    try {
      const res = await authFetch(`/api/devices/topology/${orgId}`);
      if (res.ok) {
        const data = await res.json();
        setDevices(data.devices || []);
      }
    } catch (err) {
      console.error("[Topology] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  // Socket.IO for real-time updates
  useEffect(() => {
    fetchTopology();

    const socket = io(`${SOCKET_URL}/frontend`, {
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("[Topology] Socket connected");
      socket.emit("frontend:init");
      if (orgId) {
        socket.emit("frontend:join-org", orgId);
      }
    });

    socket.on("topology:update", (data) => {
      if (data.devices) {
        setDevices(data.devices);
      }
    });

    socket.on("device:update", () => {
      // Refetch on general device updates
      fetchTopology();
    });

    return () => {
      socket.disconnect();
    };
  }, [orgId, fetchTopology]);

  // ── Helpers ──────────────────────────────

  const getNodeStatusColor = (device) => {
    if (device.status === "online") {
      const timeSince = Date.now() - new Date(device.lastSeen).getTime();
      if (timeSince < 30000) return "#22c55e"; // green
      if (timeSince < 120000) return "#eab308"; // yellow
      return "#ef4444"; // red — stale
    }
    return "#9ca3af"; // gray — offline
  };

  const getNodeStrokeColor = (device) => {
    if (device.meshRole === "root") return "#6366f1"; // indigo
    if (device.meshRole === "leaf") return "#8b5cf6"; // purple
    return "#64748b"; // slate
  };

  const getRoleBadge = (role) => {
    const colors = {
      root: "bg-indigo-100 text-indigo-800",
      node: "bg-blue-100 text-blue-800",
      leaf: "bg-purple-100 text-purple-800",
    };
    return colors[role] || colors.node;
  };

  const getRoleSize = (role) => {
    if (role === "root") return 32;
    if (role === "leaf") return 20;
    return 24;
  };

  const macShort = (mac) => (mac ? mac.slice(-8) : "N/A");

  // ── Build topology layout ───────────────

  const buildLayout = () => {
    const svgWidth = 700;
    const svgHeight = 500;
    const cx = svgWidth / 2;
    const cy = svgHeight / 2;

    const rootDevices = devices.filter((d) => d.meshRole === "root");
    const nonRoot = devices.filter((d) => d.meshRole !== "root");

    // Children: devices whose parentMac matches a root
    const rootMacs = new Set(rootDevices.map((d) => d.mac));
    const children = nonRoot.filter(
      (d) => d.parentMac && rootMacs.has(d.parentMac)
    );
    const grandchildren = nonRoot.filter(
      (d) => !d.parentMac || !rootMacs.has(d.parentMac)
    );

    const positions = {};

    // Place root(s) at center
    rootDevices.forEach((d, i) => {
      const offset = (i - (rootDevices.length - 1) / 2) * 60;
      positions[d.mac] = { x: cx + offset, y: cy };
    });

    // If no roots, place all non-root in circle
    const ring1 = children.length > 0 ? children : nonRoot;
    const ring1Radius = 160;

    ring1.forEach((d, i) => {
      const angle = (i * 2 * Math.PI) / ring1.length - Math.PI / 2;
      positions[d.mac] = {
        x: cx + Math.cos(angle) * ring1Radius,
        y: cy + Math.sin(angle) * ring1Radius,
      };
    });

    // Grandchildren in outer ring
    const ring2Radius = 220;
    grandchildren.forEach((d, i) => {
      if (!positions[d.mac]) {
        const angle = (i * 2 * Math.PI) / grandchildren.length - Math.PI / 4;
        positions[d.mac] = {
          x: cx + Math.cos(angle) * ring2Radius,
          y: cy + Math.sin(angle) * ring2Radius,
        };
      }
    });

    return { positions, svgWidth, svgHeight, cx, cy };
  };

  // ── Build edges from parentMac ──────────

  const buildEdges = (positions) => {
    const edges = [];
    devices.forEach((d) => {
      if (d.parentMac && positions[d.mac] && positions[d.parentMac]) {
        edges.push({
          from: positions[d.parentMac],
          to: positions[d.mac],
          online: d.status === "online",
        });
      }
    });
    return edges;
  };

  // ── Stats ───────────────────────────────

  const onlineCount = devices.filter((d) => d.status === "online").length;
  const offlineCount = devices.length - onlineCount;
  const rootCount = devices.filter((d) => d.meshRole === "root").length;
  const edgeCount = devices.filter((d) => d.parentMac).length;

  // ── Render ──────────────────────────────

  if (loading) {
    return (
      <div className="h-[600px] bg-white  rounded-none flex items-center justify-center">
        <div className="text-gray-500 ">
          Loading network topology...
        </div>
      </div>
    );
  }

  const { positions, svgWidth, svgHeight, cx, cy } = buildLayout();
  const edges = buildEdges(positions);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white  rounded-none shadow-sm p-6 border-[1.5px] border-gray-200 ">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900  mb-2">
              Network Topology
            </h2>
            <p className="text-gray-600 ">
              Live mesh network view — updates in real time via encrypted
              WebSocket
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("topology")}
              className={`px-4 py-2 rounded-none font-medium transition-colors ${
                viewMode === "topology"
                  ? "bg-black text-white"
                  : "bg-gray-100  text-gray-700  hover:bg-gray-200 "
              }`}
            >
              Topology
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-4 py-2 rounded-none font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-black text-white"
                  : "bg-gray-100  text-gray-700  hover:bg-gray-200 "
              }`}
            >
              List
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-indigo-50  rounded-none">
            <div className="flex items-center gap-2 mb-2">
              <Network className="w-5 h-5 text-indigo-600 " />
              <span className="text-sm font-medium text-gray-700 ">
                Total Nodes
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 ">
              {devices.length}
            </p>
          </div>
          <div className="p-4 bg-green-50  rounded-none">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-green-600 " />
              <span className="text-sm font-medium text-gray-700 ">
                Online
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 ">
              {onlineCount}
            </p>
          </div>
          <div className="p-4 bg-blue-50  rounded-none">
            <div className="flex items-center gap-2 mb-2">
              <Wifi className="w-5 h-5 text-black " />
              <span className="text-sm font-medium text-gray-700 ">
                Mesh Links
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 ">
              {edgeCount}
            </p>
          </div>
          <div className="p-4 bg-purple-50  rounded-none">
            <div className="flex items-center gap-2 mb-2">
              <Server className="w-5 h-5 text-purple-600 " />
              <span className="text-sm font-medium text-gray-700 ">
                Root Nodes
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 ">
              {rootCount}
            </p>
          </div>
        </div>
      </div>

      {/* Topology View */}
      {viewMode === "topology" ? (
        <div className="bg-white  rounded-none shadow-sm p-6 border-[1.5px] border-gray-200 ">
          <h3 className="text-xl font-semibold text-gray-900  mb-6">
            Mesh Infrastructure
          </h3>
          <div className="relative bg-gray-50  rounded-none overflow-hidden">
            {devices.length === 0 ? (
              <div className="flex items-center justify-center h-[500px] text-gray-500">
                <div className="text-center">
                  <Network className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p>No devices registered yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Provision devices from the admin panel to see them here
                  </p>
                </div>
              </div>
            ) : (
              <svg
                width="100%"
                height={svgHeight}
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="mx-auto"
              >
                {/* Cloud server icon at center */}
                <circle cx={cx} cy={cy} r={16} fill="#6366f1" opacity={0.15} />
                <circle cx={cx} cy={cy} r={8} fill="#6366f1" opacity={0.3} />
                <circle cx={cx} cy={cy} r={3} fill="#6366f1" />

                {/* Edges (parent → child) */}
                {edges.map((edge, i) => (
                  <line
                    key={`edge-${i}`}
                    x1={edge.from.x}
                    y1={edge.from.y}
                    x2={edge.to.x}
                    y2={edge.to.y}
                    stroke={edge.online ? "#22c55e" : "#d1d5db"}
                    strokeWidth={edge.online ? 2 : 1}
                    strokeDasharray={edge.online ? "none" : "5,5"}
                    opacity={0.6}
                  />
                ))}

                {/* Dashed lines from root to center server */}
                {devices
                  .filter((d) => d.meshRole === "root" && positions[d.mac])
                  .map((d) => (
                    <line
                      key={`root-center-${d.mac}`}
                      x1={cx}
                      y1={cy}
                      x2={positions[d.mac].x}
                      y2={positions[d.mac].y}
                      stroke="#6366f1"
                      strokeWidth={2}
                      strokeDasharray="4,4"
                      opacity={0.4}
                    />
                  ))}

                {/* Device nodes */}
                {devices.map((d) => {
                  const pos = positions[d.mac];
                  if (!pos) return null;
                  const r = getRoleSize(d.meshRole);
                  const fillColor = getNodeStatusColor(d);
                  const strokeColor = getNodeStrokeColor(d);
                  const isSelected = selectedNode?.mac === d.mac;

                  return (
                    <g
                      key={d.mac}
                      onClick={() =>
                        setSelectedNode(
                          selectedNode?.mac === d.mac ? null : d
                        )
                      }
                      style={{ cursor: "pointer" }}
                    >
                      {/* Pulse ring for online devices */}
                      {d.status === "online" && (
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r={r + 6}
                          fill="none"
                          stroke={fillColor}
                          strokeWidth={1.5}
                          opacity={0.3}
                        >
                          <animate
                            attributeName="r"
                            from={r + 4}
                            to={r + 14}
                            dur="2s"
                            repeatCount="indefinite"
                          />
                          <animate
                            attributeName="opacity"
                            from="0.4"
                            to="0"
                            dur="2s"
                            repeatCount="indefinite"
                          />
                        </circle>
                      )}

                      {/* Selection ring */}
                      {isSelected && (
                        <circle
                          cx={pos.x}
                          cy={pos.y}
                          r={r + 4}
                          fill="none"
                          stroke="#000"
                          strokeWidth={2}
                        />
                      )}

                      {/* Node circle */}
                      <circle
                        cx={pos.x}
                        cy={pos.y}
                        r={r}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={2.5}
                      />

                      {/* Role icon: R=root, N=node, L=leaf */}
                      <text
                        x={pos.x}
                        y={pos.y + 1}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="white"
                        fontSize={r * 0.7}
                        fontWeight="bold"
                      >
                        {d.meshRole === "root"
                          ? "R"
                          : d.meshRole === "leaf"
                          ? "L"
                          : "N"}
                      </text>

                      {/* Label */}
                      <text
                        x={pos.x}
                        y={pos.y + r + 14}
                        textAnchor="middle"
                        fill="#374151"
                        fontSize="11"
                        fontWeight="600"
                      >
                        {d.name || macShort(d.mac)}
                      </text>
                      <text
                        x={pos.x}
                        y={pos.y + r + 26}
                        textAnchor="middle"
                        fill="#9ca3af"
                        fontSize="9"
                      >
                        {macShort(d.mac)}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-6 mt-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
              Online
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" />
              Stale (&gt;30s)
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-gray-400 inline-block" />
              Offline
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-indigo-500 inline-block" />
              Cloud Server
            </div>
          </div>

          {/* Selected Node Detail Panel */}
          {selectedNode && (
            <div className="mt-6 p-4 bg-indigo-50  rounded-none border border-indigo-200 ">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900  mb-1">
                    {selectedNode.name || macShort(selectedNode.mac)}
                  </h4>
                  <p className="text-sm text-gray-600 ">
                    MAC: {selectedNode.mac}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-gray-400 hover:text-gray-600  text-xl"
                >
                  ×
                </button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-gray-600  mb-1">Status</p>
                  <p className="font-semibold text-gray-900  capitalize">
                    {selectedNode.status}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600  mb-1">Mesh Role</p>
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold rounded-none ${getRoleBadge(
                      selectedNode.meshRole
                    )}`}
                  >
                    {selectedNode.meshRole}
                  </span>
                </div>
                <div>
                  <p className="text-gray-600  mb-1">RSSI</p>
                  <p className="font-semibold text-gray-900 ">
                    {selectedNode.rssi != null
                      ? `${selectedNode.rssi} dBm`
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600  mb-1">IP Address</p>
                  <p className="font-semibold text-gray-900 ">
                    {selectedNode.ipAddress || "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600  mb-1">Last Seen</p>
                  <p className="font-semibold text-gray-900 ">
                    {selectedNode.lastSeen
                      ? new Date(selectedNode.lastSeen).toLocaleTimeString()
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600  mb-1">Parent</p>
                  <p className="font-semibold text-gray-900 ">
                    {selectedNode.parentMac
                      ? macShort(selectedNode.parentMac)
                      : "None (Root)"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600  mb-1">Encryption</p>
                  <p className="font-semibold text-gray-900 ">
                    AES-256-GCM
                  </p>
                </div>
                <div>
                  <p className="text-gray-600  mb-1">Firmware</p>
                  <p className="font-semibold text-gray-900 ">
                    {selectedNode.firmwareVersion || "1.0.0"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* List View */
        <div className="bg-white  rounded-none shadow-sm p-6 border-[1.5px] border-gray-200 ">
          <h3 className="text-xl font-semibold text-gray-900  mb-4">
            Network Nodes
          </h3>
          {devices.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Network className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p>No devices registered</p>
            </div>
          ) : (
            <div className="space-y-3">
              {devices.map((device) => {
                const statusDot =
                  device.status === "online"
                    ? "bg-green-500"
                    : "bg-gray-400";
                return (
                  <div
                    key={device.mac}
                    onClick={() =>
                      setSelectedNode(
                        selectedNode?.mac === device.mac ? null : device
                      )
                    }
                    className={`p-4 border rounded-none cursor-pointer transition-colors ${
                      selectedNode?.mac === device.mac
                        ? "border-indigo-500 bg-indigo-50 "
                        : "border-gray-200  hover:border-indigo-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="p-3 bg-gray-100  rounded-none">
                            <Wifi className="w-5 h-5 text-gray-700 " />
                          </div>
                          <span
                            className={`absolute -top-1 -right-1 w-3 h-3 rounded-full ${statusDot} border-2 border-white `}
                          />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 ">
                            {device.name || macShort(device.mac)}
                          </h4>
                          <p className="text-sm text-gray-600 ">
                            {device.mac}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded-none ${getRoleBadge(
                            device.meshRole
                          )}`}
                        >
                          {device.meshRole}
                        </span>
                        <div>
                          <p className="text-sm text-gray-600 ">
                            {device.rssi != null
                              ? `${device.rssi} dBm`
                              : "—"}
                          </p>
                          <p className="text-xs text-gray-400">
                            {device.lastSeen
                              ? new Date(
                                  device.lastSeen
                                ).toLocaleTimeString()
                              : "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
