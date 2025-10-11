'use client';

import AdminLayout from '@/components/Dashboard/AdminLayout';
import { Activity, Server, Database, Cpu, HardDrive, TrendingUp, AlertCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function MonitoringPage() {
  const [systemMetrics, setSystemMetrics] = useState({
    cpu: 45,
    memory: 68,
    disk: 52,
    network: 32,
    activeConnections: 1247,
    requestsPerSecond: 89,
  });

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setSystemMetrics(prev => ({
        cpu: Math.max(20, Math.min(90, prev.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.max(40, Math.min(85, prev.memory + (Math.random() - 0.5) * 5)),
        disk: Math.max(30, Math.min(70, prev.disk + (Math.random() - 0.5) * 3)),
        network: Math.max(10, Math.min(80, prev.network + (Math.random() - 0.5) * 15)),
        activeConnections: prev.activeConnections + Math.floor((Math.random() - 0.5) * 20),
        requestsPerSecond: Math.max(50, Math.min(150, prev.requestsPerSecond + (Math.random() - 0.5) * 10)),
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const getMetricColor = (value, threshold = 80) => {
    if (value >= threshold) return 'text-red-600 dark:text-red-400';
    if (value >= threshold * 0.7) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  const getBarColor = (value, threshold = 80) => {
    if (value >= threshold) return 'bg-red-600';
    if (value >= threshold * 0.7) return 'bg-yellow-600';
    return 'bg-green-600';
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            System Monitoring
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Real-time monitoring of platform infrastructure and performance
          </p>
        </div>

        {/* System Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <Cpu className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <h3 className={`text-2xl font-bold mb-1 ${getMetricColor(systemMetrics.cpu)}`}>
              {systemMetrics.cpu.toFixed(1)}%
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">CPU Usage</p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getBarColor(systemMetrics.cpu)}`}
                style={{ width: `${systemMetrics.cpu}%` }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-50 dark:bg-purple-900/30 rounded-lg">
                <Database className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
            <h3 className={`text-2xl font-bold mb-1 ${getMetricColor(systemMetrics.memory)}`}>
              {systemMetrics.memory.toFixed(1)}%
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Memory Usage</p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getBarColor(systemMetrics.memory)}`}
                style={{ width: `${systemMetrics.memory}%` }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                <HardDrive className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <h3 className={`text-2xl font-bold mb-1 ${getMetricColor(systemMetrics.disk)}`}>
              {systemMetrics.disk.toFixed(1)}%
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Disk Usage</p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getBarColor(systemMetrics.disk)}`}
                style={{ width: `${systemMetrics.disk}%` }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <Activity className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h3 className={`text-2xl font-bold mb-1 ${getMetricColor(systemMetrics.network)}`}>
              {systemMetrics.network.toFixed(1)}%
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">Network Usage</p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getBarColor(systemMetrics.network)}`}
                style={{ width: `${systemMetrics.network}%` }}
              />
            </div>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Active Connections
            </h2>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {systemMetrics.activeConnections.toLocaleString()}
                </p>
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <TrendingUp className="w-4 h-4" />
                  <span>+12% from last hour</span>
                </div>
              </div>
              <Server className="w-12 h-12 text-indigo-600 dark:text-indigo-400 opacity-20" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Requests Per Second
            </h2>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  {systemMetrics.requestsPerSecond.toFixed(0)}
                </p>
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                  <TrendingUp className="w-4 h-4" />
                  <span>Stable</span>
                </div>
              </div>
              <Activity className="w-12 h-12 text-indigo-600 dark:text-indigo-400 opacity-20" />
            </div>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            System Health Status
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                  <Server className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">API Server</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">All services operational</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full text-sm font-medium">
                Healthy
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/40 rounded-lg">
                  <Database className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Database</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Connected and responsive</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full text-sm font-medium">
                Healthy
              </span>
            </div>
            <div className="flex items-center justify-between p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/40 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">IDS Service</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">High load detected</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 rounded-full text-sm font-medium">
                Warning
              </span>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}



