"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/Dashboard/AdminLayout";
import {
  Shield,
  AlertTriangle,
  CheckCircle,
  Network,
  Lock,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function SecurityPage() {
  const [securityData, setSecurityData] = useState({
    totalThreats: 0,
    criticalThreats: 0,
    networksAtRisk: 0,
    avgSecurityScore: 0,
    encryptionCompliance: 0,
    mutualAuthEnabled: 0,
    recentThreats: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSecurityData = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/admin/security`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setSecurityData(data);
      } else {
        setError("Failed to fetch security data");
      }
    } catch (error) {
      console.error("Error fetching security data:", error);
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSecurityData();
    // Refresh every 30 seconds
    const interval = setInterval(fetchSecurityData, 30000);
    return () => clearInterval(interval);
  }, [fetchSecurityData]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300";
      case "high":
        return "bg-orange-100 dark:bg-orange-900/40 text-orange-800 dark:text-orange-300";
      case "medium":
        return "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300";
      case "low":
        return "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300";
    }
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-6 text-center">
            <p className="text-red-600 dark:text-red-400">{error}</p>
            <button
              onClick={fetchSecurityData}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Security Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {securityData.totalThreats}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Active Threats
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-orange-50 dark:bg-orange-900/30 rounded-lg">
                    <Shield className="w-6 h-6 text-orange-600 dark:text-orange-400" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {securityData.criticalThreats}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Critical Threats
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/30 rounded-lg">
                    <Network className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {securityData.networksAtRisk}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Networks at Risk
                </p>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {securityData.avgSecurityScore}%
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Avg Security Score
                </p>
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
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Kyber-768 Post-Quantum Encryption
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {securityData.encryptionCompliance}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full"
                      style={{ width: `${securityData.encryptionCompliance}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Mutual Authentication Enabled
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">
                      {securityData.mutualAuthEnabled} networks
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-full"
                      style={{ width: "100%" }}
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
              {securityData.recentThreats.length > 0 ? (
                <div className="space-y-3">
                  {securityData.recentThreats.map((threat) => (
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
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded ${getSeverityColor(
                                threat.severity
                              )}`}
                            >
                              {threat.severity.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {threat.organization} • {threat.network}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {formatTimestamp(threat.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    No active threats detected
                  </p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
