"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/Dashboard/AdminLayout";
import { Network, Building2, Shield, Search, Filter, Cpu } from "lucide-react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export default function NetworksPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNetworks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/admin/networks`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setNetworks(data);
      } else {
        setError("Failed to fetch networks");
      }
    } catch (error) {
      console.error("Error fetching networks:", error);
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNetworks();
  }, [fetchNetworks]);

  const filteredNetworks = networks.filter((net) => {
    const matchesSearch =
      net.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      net.organization.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === "all" || net.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case "online":
        return "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300";
      case "degraded":
        return "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300";
      case "offline":
        return "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300";
      default:
        return "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300";
    }
  };

  const getSecurityScoreColor = (score) => {
    if (score >= 90) return "text-green-600 dark:text-green-400";
    if (score >= 75) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getSecurityBarColor = (score) => {
    if (score >= 90) return "bg-green-600";
    if (score >= 75) return "bg-yellow-600";
    return "bg-red-600";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              All Networks
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Monitor and manage all IoT networks across organizations
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search networks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="all">All Status</option>
                <option value="online">Online</option>
                <option value="degraded">Degraded</option>
                <option value="offline">Offline</option>
              </select>
            </div>
          </div>
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
              onClick={fetchNetworks}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              Retry
            </button>
          </div>
        )}

        {/* Networks Table */}
        {!loading && !error && filteredNetworks.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Network
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Organization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Devices
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Security
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Threats
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredNetworks.map((network) => (
                    <tr
                      key={network.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Network className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {network.name}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              Kyber-768 • Mutual Auth
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900 dark:text-white">
                            {network.organization}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                            network.status
                          )}`}
                        >
                          {network.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900 dark:text-white">
                            {network.nodes} nodes
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-semibold ${getSecurityScoreColor(
                              network.securityScore
                            )}`}
                          >
                            {network.securityScore}%
                          </span>
                          <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${getSecurityBarColor(
                                network.securityScore
                              )}`}
                              style={{ width: `${network.securityScore}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`text-sm font-medium ${
                            network.threats > 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-green-600 dark:text-green-400"
                          }`}
                        >
                          {network.threats}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && !error && filteredNetworks.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center border border-gray-200 dark:border-gray-700">
            <Network className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || filterStatus !== "all"
                ? "No networks found matching your criteria"
                : "No networks found"}
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
