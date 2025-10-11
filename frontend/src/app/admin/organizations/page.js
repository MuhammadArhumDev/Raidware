'use client';

import AdminLayout from '@/components/Dashboard/AdminLayout';
import { Building2, Users, Network, Shield, Search, Ban, CheckCircle, Trash2, Power, Settings } from 'lucide-react';
import { useState } from 'react';

export default function OrganizationsPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [manageOrg, setManageOrg] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Mock organizations data
  const organizations = [
    {
      id: 'org1',
      name: 'Acme Corporation',
      email: 'admin@acme.com',
      networks: 5,
      devices: 120,
      status: 'active',
      threats: 0,
      joinedDate: '2024-01-15',
    },
    {
      id: 'org2',
      name: 'Tech Industries',
      email: 'contact@techind.com',
      networks: 3,
      devices: 85,
      status: 'active',
      threats: 1,
      joinedDate: '2024-02-20',
    },
    {
      id: 'org3',
      name: 'Global Logistics',
      email: 'info@globallog.com',
      networks: 8,
      devices: 200,
      status: 'active',
      threats: 2,
      joinedDate: '2024-01-10',
    },
  ];

  const filteredOrgs = organizations.filter(org =>
    org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    org.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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

        {/* Organizations List */}
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
                <span className={`px-2 py-1 text-xs font-semibold rounded ${
                  org.status === 'active'
                    ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                }`}>
                  {org.status}
                </span>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Network className="w-4 h-4" />
                    <span>Networks</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">{org.networks}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Users className="w-4 h-4" />
                    <span>Devices</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">{org.devices}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Shield className="w-4 h-4" />
                    <span>Active Threats</span>
                  </div>
                  <span className={`font-medium ${
                    org.threats > 0
                      ? 'text-red-600 dark:text-red-400'
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    {org.threats}
                  </span>
                </div>
                <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    Joined: {org.joinedDate}
                  </p>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setSelectedOrg(org)}
                  className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  View Details
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setManageOrg(org);
                  }}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
                >
                  Manage
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredOrgs.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center border border-gray-200 dark:border-gray-700">
            <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              No organizations found
            </p>
          </div>
        )}

        {/* Organization Details Modal */}
        {selectedOrg && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                      <Building2 className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {selectedOrg.name}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400 mt-1">
                        {selectedOrg.email}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedOrg(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Networks</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedOrg.networks}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Devices</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">{selectedOrg.devices}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Status</p>
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
                      selectedOrg.status === 'active'
                        ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                    }`}>
                      {selectedOrg.status}
                    </span>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active Threats</p>
                    <p className={`text-2xl font-bold ${
                      selectedOrg.threats > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                    }`}>
                      {selectedOrg.threats}
                    </p>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Joined Date</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedOrg.joinedDate}</p>
                </div>
                <div className="flex gap-3 pt-4">
                  <button className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors">
                    View Networks
                  </button>
                  <button
                    onClick={() => {
                      setSelectedOrg(null);
                      setManageOrg(selectedOrg);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
                  >
                    Manage Organization
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Manage Organization Modal */}
        {manageOrg && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                      <Settings className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                        Manage {manageOrg.name}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400 mt-1">
                        Organization management and controls
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setManageOrg(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {/* Organization Info */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 mb-1">Organization ID</p>
                      <p className="font-medium text-gray-900 dark:text-white">{manageOrg.id}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 mb-1">Status</p>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        manageOrg.status === 'active'
                          ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                      }`}>
                        {manageOrg.status}
                      </span>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 mb-1">Email</p>
                      <p className="font-medium text-gray-900 dark:text-white">{manageOrg.email}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 dark:text-gray-400 mb-1">Joined</p>
                      <p className="font-medium text-gray-900 dark:text-white">{manageOrg.joinedDate}</p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Actions
                  </h3>
                  
                  {manageOrg.status === 'active' ? (
                    <button
                      onClick={async () => {
                        setActionLoading(true);
                        // TODO: Replace with actual API call
                        setTimeout(() => {
                          setActionLoading(false);
                          setManageOrg({ ...manageOrg, status: 'suspended' });
                          // Update in organizations list
                          const orgIndex = organizations.findIndex(o => o.id === manageOrg.id);
                          if (orgIndex !== -1) {
                            organizations[orgIndex].status = 'suspended';
                          }
                        }, 1000);
                      }}
                      disabled={actionLoading}
                      className="w-full flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Ban className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-900 dark:text-white">Suspend Organization</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Temporarily disable access</p>
                      </div>
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        setActionLoading(true);
                        // TODO: Replace with actual API call
                        setTimeout(() => {
                          setActionLoading(false);
                          setManageOrg({ ...manageOrg, status: 'active' });
                          // Update in organizations list
                          const orgIndex = organizations.findIndex(o => o.id === manageOrg.id);
                          if (orgIndex !== -1) {
                            organizations[orgIndex].status = 'active';
                          }
                        }, 1000);
                      }}
                      disabled={actionLoading}
                      className="w-full flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg transition-colors disabled:opacity-50"
                    >
                      <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                      <div className="flex-1 text-left">
                        <p className="font-medium text-gray-900 dark:text-white">Activate Organization</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Restore access and services</p>
                      </div>
                    </button>
                  )}

                  <button
                    onClick={async () => {
                      if (confirm(`Are you sure you want to reset the password for ${manageOrg.name}?`)) {
                        setActionLoading(true);
                        // TODO: Replace with actual API call
                        setTimeout(() => {
                          setActionLoading(false);
                          alert('Password reset email sent to organization admin');
                        }, 1000);
                      }
                    }}
                    disabled={actionLoading}
                    className="w-full flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Power className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900 dark:text-white">Reset Password</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Send password reset email</p>
                    </div>
                  </button>

                  <button
                    onClick={async () => {
                      if (confirm(`Are you sure you want to delete ${manageOrg.name}? This action cannot be undone.`)) {
                        setActionLoading(true);
                        // TODO: Replace with actual API call
                        setTimeout(() => {
                          setActionLoading(false);
                          setManageOrg(null);
                          alert('Organization deleted successfully');
                          // In real app, would remove from list and refresh
                        }, 1000);
                      }
                    }}
                    disabled={actionLoading}
                    className="w-full flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <div className="flex-1 text-left">
                      <p className="font-medium text-gray-900 dark:text-white">Delete Organization</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Permanently remove organization</p>
                    </div>
                  </button>
                </div>

                {/* Quick Links */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                    Quick Links
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        setManageOrg(null);
                        // Navigate to networks filtered by this org
                        window.location.href = `/admin/networks?org=${manageOrg.id}`;
                      }}
                      className="p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-left transition-colors"
                    >
                      <Network className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-2" />
                      <p className="text-sm font-medium text-gray-900 dark:text-white">View Networks</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{manageOrg.networks} networks</p>
                    </button>
                    <button
                      onClick={() => {
                        setManageOrg(null);
                        // Navigate to alerts filtered by this org
                        window.location.href = `/admin/alerts?org=${manageOrg.id}`;
                      }}
                      className="p-3 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-left transition-colors"
                    >
                      <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mb-2" />
                      <p className="text-sm font-medium text-gray-900 dark:text-white">View Alerts</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{manageOrg.threats} active threats</p>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

