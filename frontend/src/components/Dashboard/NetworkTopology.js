"use client";

import { useState, useEffect } from "react";
import useDeviceStore from "@/store/useDeviceStore";
import {
  Network,
  Wifi,
  Server,
  Router,
  Shield,
  Activity,
  AlertCircle,
} from "lucide-react";

export default function NetworkTopology() {
  const nodes = useDeviceStore((state) => state.nodes);
  const loading = false; // Store doesn't have explicit loading state for nodes currently
  const [selectedNode, setSelectedNode] = useState(null);
  const [viewMode, setViewMode] = useState("topology"); // 'topology' or 'list'

  // Convert nodes to array
  const nodesList = Object.entries(nodes).map(([id, node]) => ({
    id,
    ...node,
  }));

  // Mock network connections (in real system, this would come from API)
  const connections = [
    { from: "node1", to: "node2", type: "mesh" },
    { from: "node2", to: "node3", type: "mesh" },
    { from: "node1", to: "node3", type: "mesh" },
  ];

  const getNodeStatusColor = (node) => {
    if (node.status === "online") {
      const timeSinceLastSeen = Date.now() - (node.lastSeen || 0);
      if (timeSinceLastSeen < 60000) return "bg-green-500";
      if (timeSinceLastSeen < 300000) return "bg-yellow-500";
      return "bg-red-500";
    }
    return "bg-gray-400";
  };

  if (loading) {
    return (
      <div className="h-[600px] bg-white  rounded-none flex items-center justify-center">
        <div className="text-gray-500 ">
          Loading network topology...
        </div>
      </div>
    );
  }

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
              Visual representation of your IoT mesh network infrastructure
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("topology")}
              className={`px-4 py-2 rounded-none font-medium transition-colors ${
                viewMode === "topology"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100  text-gray-700  hover:bg-gray-200 "
              }`}
            >
              Topology View
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-4 py-2 rounded-none font-medium transition-colors ${
                viewMode === "list"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100  text-gray-700  hover:bg-gray-200 "
              }`}
            >
              List View
            </button>
          </div>
        </div>

        {/* Network Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-indigo-50  rounded-none">
            <div className="flex items-center gap-2 mb-2">
              <Network className="w-5 h-5 text-indigo-600 " />
              <span className="text-sm font-medium text-gray-700 ">
                Total Nodes
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 ">
              {nodesList.length}
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
              {nodesList.filter((n) => n.status === "online").length}
            </p>
          </div>
          <div className="p-4 bg-blue-50  rounded-none">
            <div className="flex items-center gap-2 mb-2">
              <Wifi className="w-5 h-5 text-black " />
              <span className="text-sm font-medium text-gray-700 ">
                Connections
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 ">
              {connections.length}
            </p>
          </div>
          <div className="p-4 bg-purple-50  rounded-none">
            <div className="flex items-center gap-2 mb-2">
              <Server className="w-5 h-5 text-purple-600 " />
              <span className="text-sm font-medium text-gray-700 ">
                Server
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900 ">
              Online
            </p>
          </div>
        </div>
      </div>

      {/* Topology Visualization */}
      {viewMode === "topology" ? (
        <div className="bg-white  rounded-none shadow-sm p-6 border-[1.5px] border-gray-200 ">
          <h3 className="text-xl font-semibold text-gray-900  mb-6">
            Network Infrastructure
          </h3>
          <div className="relative min-h-[500px] bg-gray-50  rounded-none p-8">
            {/* Cloud Backend (Center) */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                <div className="p-6 bg-indigo-600 rounded-none shadow-lg border-4 border-white ">
                  <Server className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                  <p className="text-sm font-semibold text-gray-900 ">
                    Cloud Backend
                  </p>
                  <p className="text-xs text-gray-600 ">
                    Raidware Server
                  </p>
                </div>
              </div>
            </div>

            {/* Mesh Nodes (Circular arrangement) */}
            {nodesList.map((node, index) => {
              const angle = (index * 2 * Math.PI) / nodesList.length;
              const radius = 150;
              const x = Math.cos(angle) * radius;
              const y = Math.sin(angle) * radius;
              const statusColor = getNodeStatusColor(node);

              return (
                <div
                  key={node.id}
                  className="absolute"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  {/* Connection Line */}
                  <svg
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    style={{
                      width: "200%",
                      height: "200%",
                      left: "-50%",
                      top: "-50%",
                    }}
                  >
                    <line
                      x1="50%"
                      y1="50%"
                      x2={`${50 + (x / 300) * 100}%`}
                      y2={`${50 + (y / 300) * 100}%`}
                      stroke="#6366f1"
                      strokeWidth="2"
                      strokeDasharray="5,5"
                      opacity="0.5"
                    />
                  </svg>

                  {/* Node */}
                  <div
                    onClick={() =>
                      setSelectedNode(
                        selectedNode?.id === node.id ? null : node
                      )
                    }
                    className={`relative cursor-pointer transition-transform hover:scale-110 ${
                      selectedNode?.id === node.id ? "scale-110" : ""
                    }`}
                  >
                    <div
                      className={`p-4 ${statusColor} rounded-none shadow-lg border-4 border-white `}
                    >
                      <Wifi className="w-6 h-6 text-white" />
                    </div>
                    <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                      <p className="text-xs font-semibold text-gray-900 ">
                        {node.id}
                      </p>
                      <p className="text-xs text-gray-600 ">
                        {node.status}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Node Details Panel */}
          {selectedNode && (
            <div className="mt-6 p-4 bg-indigo-50  rounded-none border border-indigo-200 ">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900  mb-1">
                    {selectedNode.id}
                  </h4>
                  <p className="text-sm text-gray-600 ">
                    Mesh Network Node
                  </p>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-gray-400 hover:text-gray-600 "
                >
                  ×
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600  mb-1">
                    Status
                  </p>
                  <p className="font-semibold text-gray-900  capitalize">
                    {selectedNode.status}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600  mb-1">
                    Last Seen
                  </p>
                  <p className="font-semibold text-gray-900 ">
                    {selectedNode.lastSeen
                      ? new Date(selectedNode.lastSeen).toLocaleTimeString()
                      : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600  mb-1">
                    Node Type
                  </p>
                  <p className="font-semibold text-gray-900 ">
                    ESP32 Mesh
                  </p>
                </div>
                <div>
                  <p className="text-gray-600  mb-1">
                    Encryption
                  </p>
                  <p className="font-semibold text-gray-900 ">
                    AES-256
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
          <div className="space-y-3">
            {nodesList.map((node) => {
              const statusColor = getNodeStatusColor(node);
              return (
                <div
                  key={node.id}
                  onClick={() =>
                    setSelectedNode(selectedNode?.id === node.id ? null : node)
                  }
                  className={`p-4 border rounded-none cursor-pointer transition-colors ${
                    selectedNode?.id === node.id
                      ? "border-indigo-500 bg-indigo-50 "
                      : "border-gray-200  hover:border-indigo-300"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 rounded-none ${statusColor
                          .replace("bg-", "bg-")
                          .replace("-500", "-100")} 
                          .replace("bg-", "bg-")
                          .replace("-500", "-900/40")}`}
                      >
                        <Wifi
                          className={`w-6 h-6 ${statusColor.replace(
                            "bg-",
                            "text-"
                          )}`}
                        />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 ">
                          {node.id}
                        </h4>
                        <p className="text-sm text-gray-600 ">
                          Status:{" "}
                          <span className="capitalize">{node.status}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 ">
                        Last Seen
                      </p>
                      <p className="text-sm font-medium text-gray-900 ">
                        {node.lastSeen
                          ? new Date(node.lastSeen).toLocaleTimeString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
