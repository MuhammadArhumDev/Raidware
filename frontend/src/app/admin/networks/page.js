'use client';

import AdminLayout from '@/components/Dashboard/AdminLayout';
import { Network, Building2, Shield, Activity, Search, Filter, MoreVertical } from 'lucide-react';
import { useState } from 'react';

export default function NetworksPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedNetwork, setSelectedNetwork] = useState(null);

  // Mock networks data
  const networks = [
    {
      id: 'net1',
      name: 'Acme Main Network',
      organization: 'Acme Corporation',
      orgId: 'org1',
      nodes: 25,
      devices: 120,
      status: 'online',
      securityScore: 96,
      threats: 0,
      encryption: 'AES-256',
      mutualAuth: true,
      lastActivity: Date.now() - 300000,
    },
    {
      id: 'net2',
      name: 'Tech Industries Network',
      organization: 'Tech Industries',
      orgId: 'org2',
      nodes: 18,
      devices: 85,
      status: 'online',
      securityScore: 92,
      threats: 1,
      encryption: 'AES-256',
      mutualAuth: true,
      lastActivity: Date.now() - 600000,
    },
    {
      id: 'net3',
      name: 'Global Logistics Network 1',
      organization: 'Global Logistics',
      orgId: 'org3',
      nodes: 35,
      devices: 200,
      status: 'online',
      securityScore: 88,
      threats: 2,
      encryption: 'AES-128',
      mutualAuth: false,
      lastActivity: Date.now() - 120000,
    },
    {
      id: 'net4',
      name: 'Global Logistics Network 2',
      organization: 'Global Logistics',
      orgId: 'org3',
      nodes: 22,
      devices: 150,
      status: 'degraded',
      securityScore: 85,
      threats: 0,
      encryption: 'AES-256',
      mutualAuth: true,
      lastActivity: Date.now() - 1800000,
    },
  ];

  const filteredNetworks = networks.filter(net => {
    const matchesSearch = net.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         net.organization.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || net.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300';
      case 'degraded': return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300';
      case 'offline': return 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300';
      default: return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300';
    }
  };

  const getSecurityScoreColor = (score) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 75) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
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

        {/* Networks Table */}
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
                    Nodes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Security
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Threats
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredNetworks.map((network) => (
                  <tr
                    key={network.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                    onClick={() => setSelectedNetwork(network)}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Network className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mr-3" />
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {network.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {network.encryption} {network.mutualAuth && '• Mutual Auth'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {network.organization}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(network.status)}`}>
                        {network.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">
                        {network.nodes} nodes
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {network.devices} devices
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${getSecurityScoreColor(network.securityScore)}`}>
                          {network.securityScore}%
                        </span>
                        <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${
                              network.securityScore >= 90 ? 'bg-green-600' :
                              network.securityScore >= 75 ? 'bg-yellow-600' : 'bg-red-600'
                            }`}
                            style={{ width: `${network.securityScore}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`text-sm font-medium ${
                        network.threats > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                      }`}>
                        {network.threats}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300">
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredNetworks.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center border border-gray-200 dark:border-gray-700">
            <Network className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">No networks found</p>
          </div>
        )}

        {/* Network Details Modal */}
        {selectedNetwork && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedNetwork.name}
                    </h2>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">
                      {selectedNetwork.organization}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedNetwork(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Status</p>
                    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(selectedNetwork.status)}`}>
                      {selectedNetwork.status}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Security Score</p>
                    <p className={`text-lg font-bold ${getSecurityScoreColor(selectedNetwork.securityScore)}`}>
                      {selectedNetwork.securityScore}%
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Nodes</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedNetwork.nodes}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Devices</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{selectedNetwork.devices}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Encryption</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedNetwork.encryption}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Mutual Auth</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {selectedNetwork.mutualAuth ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                </div>
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Last Activity</p>
                  <p className="text-sm text-gray-900 dark:text-white">
                    {new Date(selectedNetwork.lastActivity).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}



