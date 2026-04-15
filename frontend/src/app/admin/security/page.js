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
import { SkeletonGrid } from "@/components/Skeleton";
import authFetch from "@/lib/authFetch";

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
      const response = await authFetch("/api/admin/security");
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

    const interval = setInterval(fetchSecurityData, 30000);
    return () => clearInterval(interval);
  }, [fetchSecurityData]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case "critical":
        return "bg-red-100  text-red-800 ";
      case "high":
        return "bg-orange-100  text-orange-800 ";
      case "medium":
        return "bg-yellow-100  text-yellow-800 ";
      case "low":
        return "bg-blue-100  text-blue-800 ";
      default:
        return "bg-gray-100  text-gray-800 ";
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
          <h1 className="text-3xl font-bold text-gray-900  mb-2">
            Security Overview
          </h1>
          <p className="text-gray-600 ">
            Monitor security status across all organizations and networks
          </p>
        </div>

        {}
        {loading && (
          <div className="space-y-6">
            <SkeletonGrid count={4} />
            <SkeletonGrid count={1} />
          </div>
        )}

        {}
        {error && !loading && (
          <div className="bg-red-50  rounded-none p-6 text-center">
            <p className="text-red-600 ">{error}</p>
            <button
              onClick={fetchSecurityData}
              className="mt-4 px-4 py-2 bg-black text-white hover:bg-gray-800 border border-transparent text-white rounded-none"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white  rounded-none shadow-sm p-6 border-[1.5px] border-gray-200 ">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-red-50  rounded-none">
                    <AlertTriangle className="w-6 h-6 text-red-600 " />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900  mb-1">
                  {securityData.totalThreats}
                </h3>
                <p className="text-sm text-gray-600 ">
                  Active Threats
                </p>
              </div>

              <div className="bg-white  rounded-none shadow-sm p-6 border-[1.5px] border-gray-200 ">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-orange-50  rounded-none">
                    <Shield className="w-6 h-6 text-orange-600 " />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900  mb-1">
                  {securityData.criticalThreats}
                </h3>
                <p className="text-sm text-gray-600 ">
                  Critical Threats
                </p>
              </div>

              <div className="bg-white  rounded-none shadow-sm p-6 border-[1.5px] border-gray-200 ">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-yellow-50  rounded-none">
                    <Network className="w-6 h-6 text-yellow-600 " />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900  mb-1">
                  {securityData.networksAtRisk}
                </h3>
                <p className="text-sm text-gray-600 ">
                  Networks at Risk
                </p>
              </div>

              <div className="bg-white  rounded-none shadow-sm p-6 border-[1.5px] border-gray-200 ">
                <div className="flex items-center justify-between mb-4">
                  <div className="p-3 bg-green-50  rounded-none">
                    <CheckCircle className="w-6 h-6 text-green-600 " />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900  mb-1">
                  {securityData.avgSecurityScore}%
                </h3>
                <p className="text-sm text-gray-600 ">
                  Avg Security Score
                </p>
              </div>
            </div>

            {}
            <div className="bg-white  rounded-none shadow-sm p-6 border-[1.5px] border-gray-200 ">
              <h2 className="text-xl font-semibold text-gray-900  mb-4">
                Security Compliance
              </h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-indigo-600 " />
                      <span className="text-sm font-medium text-gray-700 ">
                        Kyber-768 Post-Quantum Encryption
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 ">
                      {securityData.encryptionCompliance}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200  rounded-none h-2">
                    <div
                      className="bg-green-600 h-2 rounded-none"
                      style={{ width: `${securityData.encryptionCompliance}%` }}
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-indigo-600 " />
                      <span className="text-sm font-medium text-gray-700 ">
                        Mutual Authentication Enabled
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900 ">
                      {securityData.mutualAuthEnabled} networks
                    </span>
                  </div>
                  <div className="w-full bg-gray-200  rounded-none h-2">
                    <div
                      className="bg-indigo-600 h-2 rounded-none"
                      style={{ width: "100%" }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {}
            <div className="bg-white  rounded-none shadow-sm p-6 border-[1.5px] border-gray-200 ">
              <h2 className="text-xl font-semibold text-gray-900  mb-4">
                Recent Security Threats
              </h2>
              {securityData.recentThreats.length > 0 ? (
                <div className="space-y-3">
                  {securityData.recentThreats.map((threat) => (
                    <div
                      key={threat.id}
                      className="p-4 border-[1.5px] border-gray-200  rounded-none hover:bg-gray-50  transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-gray-900 ">
                              {threat.type}
                            </h3>
                            <span
                              className={`px-2 py-1 text-xs font-semibold rounded-none ${getSeverityColor(
                                threat.severity
                              )}`}
                            >
                              {threat.severity.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 ">
                            {threat.organization} • {threat.network}
                          </p>
                          <p className="text-xs text-gray-500  mt-1">
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
                  <p className="text-gray-600 ">
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
