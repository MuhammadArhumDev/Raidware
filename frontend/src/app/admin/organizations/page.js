"use client";

import { useEffect, useState, useCallback } from "react";
import AdminLayout from "@/components/Dashboard/AdminLayout";
import { Building2, Network, Shield, Search, Cpu } from "lucide-react";
import authFetch from "@/lib/authFetch";

export default function OrganizationsPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await authFetch("/api/admin/organizations");
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
            <h1 className="text-3xl font-bold text-gray-900  mb-2">
              Organizations
            </h1>
            <p className="text-gray-600 ">
              Manage and monitor all registered organizations
            </p>
          </div>
        </div>

        {}
        <div className="bg-white  rounded-none shadow-sm p-4 border-[1.5px] border-gray-200 ">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search organizations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border-[1.5px] border-gray-300  rounded-none bg-white  text-gray-900 "
            />
          </div>
        </div>

        {}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-none h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        )}

        {}
        {error && !loading && (
          <div className="bg-red-50  rounded-none p-6 text-center">
            <p className="text-red-600 ">{error}</p>
            <button
              onClick={fetchOrganizations}
              className="mt-4 px-4 py-2 bg-black text-white hover:bg-gray-800 border border-transparent text-white rounded-none"
            >
              Retry
            </button>
          </div>
        )}

        {}
        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOrgs.map((org) => (
              <div
                key={org.id}
                className="bg-white  rounded-none shadow-sm p-6 border-[1.5px] border-gray-200  hover:border-indigo-300 transition-colors"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50  rounded-none">
                      <Building2 className="w-6 h-6 text-indigo-600 " />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 ">
                        {org.name}
                      </h3>
                      <p className="text-sm text-gray-600 ">
                        {org.email}
                      </p>
                    </div>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-none ${
                      org.status === "active"
                        ? "bg-green-100  text-green-800 "
                        : "bg-gray-100  text-gray-800 "
                    }`}
                  >
                    {org.status}
                  </span>
                </div>

                <div className="space-y-3">
                  {}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-600 ">
                      <Network className="w-4 h-4" />
                      <span>Network</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium text-gray-900 ">
                        {org.network?.name || "No Network"}
                      </span>
                      {org.network && (
                        <span
                          className={`ml-2 px-1.5 py-0.5 text-xs rounded-none ${
                            org.network.status === "online"
                              ? "bg-green-100  text-green-800 "
                              : org.network.status === "degraded"
                              ? "bg-yellow-100  text-yellow-800 "
                              : "bg-red-100  text-red-800 "
                          }`}
                        >
                          {org.network.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-600 ">
                      <Cpu className="w-4 h-4" />
                      <span>Active Devices</span>
                    </div>
                    <span className="font-medium text-gray-900 ">
                      {org.devices}
                    </span>
                  </div>

                  {}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-600 ">
                      <Shield className="w-4 h-4" />
                      <span>Active Threats</span>
                    </div>
                    <span
                      className={`font-medium ${
                        org.threats > 0
                          ? "text-red-600 "
                          : "text-green-600 "
                      }`}
                    >
                      {org.threats}
                    </span>
                  </div>

                  {}
                  <div className="pt-3 border-t-[1.5px] border-gray-200 ">
                    <p className="text-xs text-gray-500 ">
                      Joined: {formatDate(org.joinedDate)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {!loading && !error && filteredOrgs.length === 0 && (
          <div className="bg-white  rounded-none shadow-sm p-12 text-center border-[1.5px] border-gray-200 ">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 ">
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
