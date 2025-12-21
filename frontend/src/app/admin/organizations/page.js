"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/Dashboard/AdminLayout";
import { Building2, Network, Shield, Search, Cpu } from "lucide-react";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

export default function OrganizationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE_URL}/api/admin/organizations`, {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setOrganizations(data);
      } else {
        setError("Failed to fetch organizations");
      }
    } catch (error) {
      console.error("Error fetching organizations:", error);
      setError("Failed to connect to server");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganizations();
  }, [fetchOrganizations]);

  const filteredOrgs = organizations.filter(
    (org) =>
      org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      org.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Organizations
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage and monitor all registered organizations
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search organizations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
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
              onClick={fetchOrganizations}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
            >
              Retry
            </button>
          </div>
        )}

        {/* Organizations List */}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrgs.map((org) => (
              <div
                key={org.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                      <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {org.name}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {org.email}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded ${
                      org.status === "active"
                        ? "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300"
                    }`}
                  >
                    {org.status}
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Network Info */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Network className="w-4 h-4" />
                      <span>Network</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium text-gray-900 dark:text-white">
                        {org.network?.name || "No Network"}
                      </span>
                      {org.network && (
                        <span
                          className={`ml-2 px-1.5 py-0.5 text-xs rounded ${
                            org.network.status === "online"
                              ? "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300"
                              : org.network.status === "degraded"
                              ? "bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300"
                              : "bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300"
                          }`}
                        >
                          {org.network.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Devices */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Cpu className="w-4 h-4" />
                      <span>Active Devices</span>
                    </div>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {org.devices}
                    </span>
                  </div>

                  {/* Threats */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                      <Shield className="w-4 h-4" />
                      <span>Active Threats</span>
                    </div>
                    <span
                      className={`font-medium ${
                        org.threats > 0
                          ? "text-red-600 dark:text-red-400"
                          : "text-green-600 dark:text-green-400"
                      }`}
                    >
                      {org.threats}
                    </span>
                  </div>

                  {/* Joined Date */}
                  <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-500 dark:text-gray-500">
                      Joined: {formatDate(org.joinedDate)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && filteredOrgs.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center border border-gray-200 dark:border-gray-700">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm
                ? "No organizations found matching your search"
                : "No organizations found"}
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
