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
    <div className="bg-white  rounded-none shadow-sm p-6 border-[1.5px] border-gray-200 ">
      <h2 className="text-xl font-semibold text-gray-900  mb-6">
        Performance Metrics
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4 bg-gradient-to-br from-indigo-50 to-indigo-100   rounded-none">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-indigo-600 rounded-none">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900 ">
              {data.avgLatency}ms
            </span>
          </div>
          <p className="text-sm font-medium text-gray-700 ">Avg Latency</p>
          <p className="text-xs text-gray-600  mt-1">Intra-mesh communication</p>
        </div>

        <div className="p-4 bg-gradient-to-br from-green-50 to-green-100   rounded-none">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-green-600 rounded-none">
              <Wifi className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900 ">
              {data.packetLoss}%
            </span>
          </div>
          <p className="text-sm font-medium text-gray-700 ">Packet Loss</p>
          <p className="text-xs text-gray-600  mt-1">Network reliability</p>
        </div>

        <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100   rounded-none">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-600 rounded-none">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900 ">
              {data.throughput}
            </span>
          </div>
          <p className="text-sm font-medium text-gray-700 ">Throughput</p>
          <p className="text-xs text-gray-600  mt-1">Packets per second</p>
        </div>

        <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100   rounded-none">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-purple-600 rounded-none">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-bold text-gray-900 ">
              {data.encryptionOverhead}%
            </span>
          </div>
          <p className="text-sm font-medium text-gray-700 ">Encryption Overhead</p>
          <p className="text-xs text-gray-600  mt-1">Security processing cost</p>
        </div>
      </div>
    </div>
  );
}

