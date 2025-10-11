'use client';

import AdminLayout from '@/components/Dashboard/AdminLayout';
import { Shield, AlertTriangle, CheckCircle, TrendingUp, Network } from 'lucide-react';

export default function SecurityPage() {
  const securityStats = {
    totalThreats: 3,
    criticalThreats: 1,
    networksAtRisk: 2,
    avgSecurityScore: 94.5,
    encryptionCompliance: 98,
    mutualAuthEnabled: 45,
  };

  const recentThreats = [
    {
      id: 'threat1',
      organization: 'Tech Industries',
      network: 'Network-3',
      type: 'Rogue AP Detected',
      severity: 'critical',
      timestamp: Date.now() - 3600000,
    },
    {
      id: 'threat2',
      organization: 'Global Logistics',
      network: 'Network-5',
      type: 'ARP Spoofing',
      severity: 'high',
      timestamp: Date.now() - 7200000,
    },
    {
      id: 'threat3',
      organization: 'Global Logistics',
      network: 'Network-2',
      type: 'Unauthorized Access',
      severity: 'medium',
      timestamp: Date.now() - 10800000,
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Security Overview
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor security status across all organizations and networks
          </p>
        </div>

        {/* Security Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {securityStats.totalThreats}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Active Threats</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                <Shield className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {securityStats.criticalThreats}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Critical Threats</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                <Network className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {securityStats.networksAtRisk}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Networks at Risk</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {securityStats.avgSecurityScore}%
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">Avg Security Score</p>
          </div>
        </div>

        {/* Security Compliance */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Security Compliance
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Encryption Enabled
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {securityStats.encryptionCompliance}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${securityStats.encryptionCompliance}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Mutual Authentication Enabled
                </span>
                <span className="text-sm font-semibold text-gray-900 dark:text-white">
                  {securityStats.mutualAuthEnabled} networks
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-indigo-600 h-2 rounded-full"
                  style={{ width: `${(securityStats.mutualAuthEnabled / 50) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Threats */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Recent Security Threats
          </h2>
          <div className="space-y-3">
            {recentThreats.map((threat) => (
              <div
                key={threat.id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {threat.type}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${
                        threat.severity === 'critical'
                          ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'
                          : threat.severity === 'high'
                          ? 'bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300'
                          : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300'
                      }`}>
                        {threat.severity.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {threat.organization} • {threat.network}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {new Date(threat.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}



