'use client';

import { Zap, Clock, Wifi, Shield } from 'lucide-react';

export default function PerformanceMetrics({ metrics }) {
  const defaultMetrics = {
    avgLatency: 45,
    packetLoss: 0.3,
    throughput: 180,
    encryptionOverhead: 2.5,
  };

  const data = metrics || defaultMetrics;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
        Performance Metrics
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-900/10 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-indigo-600 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {data.avgLatency}ms
            </span>
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Avg Latency</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Intra-mesh communication</p>
        </div>

        <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-600 rounded-lg">
              <Wifi className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {data.packetLoss}%
            </span>
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Packet Loss</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Network reliability</p>
        </div>

        <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {data.throughput}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Throughput</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Packets per second</p>
        </div>

        <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-900/10 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-600 rounded-lg">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {data.encryptionOverhead}%
            </span>
          </div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Encryption Overhead</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Security processing cost</p>
        </div>
      </div>
    </div>
  );
}

