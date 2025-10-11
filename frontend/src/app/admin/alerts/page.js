'use client';

import AdminLayout from '@/components/Dashboard/AdminLayout';
import IDSAlerts from '@/components/Dashboard/IDSAlerts';
import { Shield, Filter, Download } from 'lucide-react';
import { useState } from 'react';

export default function AdminAlertsPage() {
  const [filterOrg, setFilterOrg] = useState('all');

  const organizations = [
    { id: 'all', name: 'All Organizations' },
    { id: 'org1', name: 'Acme Corporation' },
    { id: 'org2', name: 'Tech Industries' },
    { id: 'org3', name: 'Global Logistics' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Global Alerts
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Monitor security alerts across all organizations and networks
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2">
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Organization Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Filter className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Filter by Organization:</span>
            <div className="flex gap-2">
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => setFilterOrg(org.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    filterOrg === org.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {org.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Enhanced IDS Alerts Component */}
        <IDSAlerts />
      </div>
    </AdminLayout>
  );
}



