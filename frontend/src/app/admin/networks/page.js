"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/Dashboard/AdminLayout";
import { Network, Building2, Shield, Search, Filter, Cpu } from "lucide-react";
import { SkeletonTable } from "@/components/Skeleton";
import authFetch from "@/lib/authFetch";

export default function NetworksPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [networks, setNetworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchNetworks = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authFetch("/api/admin/networks");
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
        return "bg-green-100  text-green-800 ";
      case "degraded":
        return "bg-yellow-100  text-yellow-800 ";
      case "offline":
        return "bg-red-100  text-red-800 ";
      default:
        return "bg-gray-100  text-gray-800 ";
    }
  };

  const getSecurityScoreColor = (score) => {
    if (score >= 90) return "text-green-600 ";
    if (score >= 75) return "text-yellow-600 ";
    return "text-red-600 ";
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
            <h1 className="text-3xl font-bold text-gray-900  mb-2">
              All Networks
            </h1>
            <p className="text-gray-600 ">
              Monitor and manage all IoT networks across organizations
            </p>
          </div>
        </div>

        {}
        <div className="bg-white  rounded-none shadow-sm p-4 border-[1.5px] border-gray-200 ">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search networks..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-[1.5px] border-gray-300  rounded-none bg-white  text-gray-900 "
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border-[1.5px] border-gray-300  rounded-none bg-white  text-gray-900 "
              >
                <option value="all">All Status</option>
                <option value="online">Online</option>
                <option value="degraded">Degraded</option>
                <option value="offline">Offline</option>
              </select>
            </div>
          </div>
        </div>

        {}
        {loading && <SkeletonTable rows={5} cols={6} />}

        {}
        {error && !loading && (
          <div className="bg-red-50  rounded-none p-6 text-center">
            <p className="text-red-600 ">{error}</p>
            <button
              onClick={fetchNetworks}
              className="mt-4 px-4 py-2 bg-black text-white hover:bg-gray-800 border border-transparent text-white rounded-none"
            >
              Retry
            </button>
          </div>
        )}

        {}
        {!loading && !error && filteredNetworks.length > 0 && (
          <div className="bg-white  rounded-none shadow-sm border-[1.5px] border-gray-200  overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 ">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500  uppercase tracking-wider">
                      Network
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500  uppercase tracking-wider">
                      Organization
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500  uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500  uppercase tracking-wider">
                      Devices
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500  uppercase tracking-wider">
                      Security
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500  uppercase tracking-wider">
                      Threats
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white  divide-y divide-gray-200 ">
                  {filteredNetworks.map((network) => (
                    <tr key={network.id} className="hover:bg-gray-50 ">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Network className="w-5 h-5 text-indigo-600  mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900 ">
                              {network.name}
                            </div>
                            <div className="text-xs text-gray-500 ">
                              Kyber-768 • Mutual Auth
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900 ">
                            {network.organization}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-none ${getStatusColor(
                            network.status,
                          )}`}
                        >
                          {network.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-900 ">
                            {network.nodes} nodes
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-semibold ${getSecurityScoreColor(
                              network.securityScore,
                            )}`}
                          >
                            {network.securityScore}%
                          </span>
                          <div className="w-16 bg-gray-200  rounded-none h-2">
                            <div
                              className={`h-2 rounded-none ${getSecurityBarColor(
                                network.securityScore,
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
                              ? "text-red-600 "
                              : "text-green-600 "
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
          <div className="bg-white  rounded-none shadow-sm p-12 text-center border-[1.5px] border-gray-200 ">
            <Network className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 ">
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
