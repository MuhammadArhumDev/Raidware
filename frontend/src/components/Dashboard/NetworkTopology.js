'use client';

import { useState, useEffect } from 'react';
import { useData } from '@/contexts/DataContext';
import { Network, Wifi, Server, Router, Shield, Activity, AlertCircle } from 'lucide-react';

export default function NetworkTopology() {
  const { nodes, loading } = useData();
  const [selectedNode, setSelectedNode] = useState(null);
  const [viewMode, setViewMode] = useState('topology'); // 'topology' or 'list'

  // Convert nodes to array
  const nodesList = Object.entries(nodes).map(([id, node]) => ({
    id,
    ...node,
  }));

  // Mock network connections (in real system, this would come from API)
  const connections = [
    { from: 'node1', to: 'node2', type: 'mesh' },
    { from: 'node2', to: 'node3', type: 'mesh' },
    { from: 'node1', to: 'node3', type: 'mesh' },
  ];

  const getNodeStatusColor = (node) => {
    if (node.status === 'online') {
      const timeSinceLastSeen = Date.now() - (node.lastSeen || 0);
      if (timeSinceLastSeen < 60000) return 'bg-green-500';
      if (timeSinceLastSeen < 300000) return 'bg-yellow-500';
      return 'bg-red-500';
    }
    return 'bg-gray-400';
  };

  if (loading) {
    return (
      <div className="h-[600px] bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Loading network topology...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Network Topology
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Visual representation of your IoT mesh network infrastructure
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('topology')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'topology'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Topology View
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              List View
            </button>
          </div>
        </div>

        {/* Network Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Network className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Nodes</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{nodesList.length}</p>
          </div>
          <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Online</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {nodesList.filter(n => n.status === 'online').length}
            </p>
          </div>
          <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Wifi className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Connections</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{connections.length}</p>
          </div>
          <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Router className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Gateways</span>
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">1</p>
          </div>
        </div>
      </div>

      {/* Topology Visualization */}
      {viewMode === 'topology' ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            Network Infrastructure
          </h3>
          <div className="relative min-h-[500px] bg-gray-50 dark:bg-gray-900/50 rounded-lg p-8">
            {/* Gateway (Center) */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                <div className="p-6 bg-indigo-600 rounded-full shadow-lg border-4 border-white dark:border-gray-800">
                  <Server className="w-8 h-8 text-white" />
                </div>
                <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Gateway</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Raspberry Pi</p>
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
                <div key={node.id} className="absolute" style={{ left: `calc(50% + ${x}px)`, top: `calc(50% + ${y}px)`, transform: 'translate(-50%, -50%)' }}>
                  {/* Connection Line */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ width: '200%', height: '200%', left: '-50%', top: '-50%' }}>
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
                    onClick={() => setSelectedNode(selectedNode?.id === node.id ? null : node)}
                    className={`relative cursor-pointer transition-transform hover:scale-110 ${
                      selectedNode?.id === node.id ? 'scale-110' : ''
                    }`}
                  >
                    <div className={`p-4 ${statusColor} rounded-full shadow-lg border-4 border-white dark:border-gray-800`}>
                      <Wifi className="w-6 h-6 text-white" />
                    </div>
                    <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white">{node.id}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{node.status}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Node Details Panel */}
          {selectedNode && (
            <div className="mt-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                    {selectedNode.id}
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Mesh Network Node
                  </p>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  ×
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 dark:text-gray-400 mb-1">Status</p>
                  <p className="font-semibold text-gray-900 dark:text-white capitalize">
                    {selectedNode.status}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400 mb-1">Last Seen</p>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {selectedNode.lastSeen ? new Date(selectedNode.lastSeen).toLocaleTimeString() : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400 mb-1">Node Type</p>
                  <p className="font-semibold text-gray-900 dark:text-white">ESP32 Mesh</p>
                </div>
                <div>
                  <p className="text-gray-600 dark:text-gray-400 mb-1">Encryption</p>
                  <p className="font-semibold text-gray-900 dark:text-white">AES-256</p>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Network Nodes
          </h3>
          <div className="space-y-3">
            {nodesList.map((node) => {
              const statusColor = getNodeStatusColor(node);
              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNode(selectedNode?.id === node.id ? null : node)}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedNode?.id === node.id
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${statusColor.replace('bg-', 'bg-').replace('-500', '-100')} dark:${statusColor.replace('bg-', 'bg-').replace('-500', '-900/40')}`}>
                        <Wifi className={`w-6 h-6 ${statusColor.replace('bg-', 'text-')}`} />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {node.id}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Status: <span className="capitalize">{node.status}</span>
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Last Seen
                      </p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {node.lastSeen ? new Date(node.lastSeen).toLocaleTimeString() : 'N/A'}
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

