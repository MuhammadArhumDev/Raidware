'use client';

import { useEffect, useState } from 'react';
import AdminLayout from '@/components/Dashboard/AdminLayout';
import StatsCard from '@/components/Dashboard/StatsCard';
import MetricChart from '@/components/Dashboard/MetricChart';
import RealTimeChart from '@/components/Dashboard/RealTimeChart';
import { Building2, Network, Shield, Activity, TrendingUp, Users } from 'lucide-react';

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalOrganizations: 0,
    totalNetworks: 0,
    activeThreats: 0,
    systemHealth: 0,
  });
  const [orgCountHistory, setOrgCountHistory] = useState([]);
  const [networkCountHistory, setNetworkCountHistory] = useState([]);
  const [threatCountHistory, setThreatCountHistory] = useState([]);
  const [systemHealthHistory, setSystemHealthHistory] = useState([]);

  useEffect(() => {
    // TODO: Replace with actual API calls
    // Mock data for admin dashboard
    setStats({
      totalOrganizations: 12,
      totalNetworks: 45,
      activeThreats: 3,
      systemHealth: 98.5,
    });
  }, []);

  useEffect(() => {
    // Simulate real-time updates for charts
    const updateCharts = () => {
      const now = Date.now();
      setOrgCountHistory(prev => {
        const newHistory = [...prev, { timestamp: now, value: stats.totalOrganizations + Math.floor(Math.random() * 2) }];
        return newHistory.slice(-30);
      });
      setNetworkCountHistory(prev => {
        const newHistory = [...prev, { timestamp: now, value: stats.totalNetworks + Math.floor(Math.random() * 3) }];
        return newHistory.slice(-30);
      });
      setThreatCountHistory(prev => {
        const newHistory = [...prev, { timestamp: now, value: Math.max(0, stats.activeThreats + Math.floor((Math.random() - 0.5) * 2)) }];
        return newHistory.slice(-30);
      });
      setSystemHealthHistory(prev => {
        const newHistory = [...prev, { timestamp: now, value: Math.min(100, Math.max(90, stats.systemHealth + (Math.random() - 0.5) * 2)) }];
        return newHistory.slice(-30);
      });
    };

    updateCharts();
    const interval = setInterval(updateCharts, 5000);
    return () => clearInterval(interval);
  }, [stats]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Monitor and manage all organizations and their IoT infrastructure security
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            icon={Building2}
            title="Total Organizations"
            value={stats.totalOrganizations}
            change={2.5}
            trend="up"
          />
          <StatsCard
            icon={Network}
            title="Active Networks"
            value={stats.totalNetworks}
            change={8.2}
            trend="up"
          />
          <StatsCard
            icon={Shield}
            title="Active Threats"
            value={stats.activeThreats}
            change={-15.0}
            trend="down"
          />
          <StatsCard
            icon={Activity}
            title="System Health"
            value={`${stats.systemHealth}%`}
            change={1.2}
            trend="up"
          />
        </div>

        {/* Real-time Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MetricChart
            title="Organizations Growth"
            dataSource={orgCountHistory}
            dataKey="value"
            color="indigo"
            type="area"
            height={280}
            unit=" orgs"
            gradient={true}
          />
          <MetricChart
            title="Networks Growth"
            dataSource={networkCountHistory}
            dataKey="value"
            color="blue"
            type="line"
            height={280}
            unit=" networks"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MetricChart
            title="Active Threats Trend"
            dataSource={threatCountHistory}
            dataKey="value"
            color="red"
            type="bar"
            height={280}
            unit=" threats"
          />
          <MetricChart
            title="System Health"
            dataSource={systemHealthHistory}
            dataKey="value"
            color="green"
            type="area"
            height={280}
            unit="%"
            gradient={true}
          />
        </div>

        {/* Platform Overview Chart */}
        <RealTimeChart
          type="line"
          height={300}
          title="Platform Activity Overview"
          data={{
            labels: orgCountHistory.slice(-20).map((_, i) => {
              const timestamp = orgCountHistory[orgCountHistory.length - 20 + i]?.timestamp || Date.now();
              return new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            }),
            datasets: [
              {
                label: 'Organizations',
                data: orgCountHistory.slice(-20).map(d => d.value),
                borderColor: 'rgba(99, 102, 241, 1)',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                tension: 0.4,
                yAxisID: 'y',
              },
              {
                label: 'Networks',
                data: networkCountHistory.slice(-20).map(d => d.value),
                borderColor: 'rgba(59, 130, 246, 1)',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                tension: 0.4,
                yAxisID: 'y1',
              },
              {
                label: 'Threats',
                data: threatCountHistory.slice(-20).map(d => d.value),
                borderColor: 'rgba(239, 68, 68, 1)',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                tension: 0.4,
                yAxisID: 'y2',
              },
            ],
          }}
        />

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/admin/organizations"
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                Manage Organizations
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                View and manage all registered organizations
              </p>
            </a>
            <a
              href="/admin/security"
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                Security Overview
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Monitor security status across all networks
              </p>
            </a>
            <a
              href="/admin/alerts"
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                Global Alerts
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Review all security alerts and threats
              </p>
            </a>
          </div>
        </div>

        {/* System Status */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            System Status
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="text-gray-900 dark:text-white">Platform Status</span>
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full text-sm font-medium">
                Operational
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="text-gray-900 dark:text-white">IDS Service</span>
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full text-sm font-medium">
                Active
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="text-gray-900 dark:text-white">Encryption Service</span>
              <span className="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full text-sm font-medium">
                Running
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <span className="text-gray-900 dark:text-white">Active Threats</span>
              <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 rounded-full text-sm font-medium">
                {stats.activeThreats} Detected
              </span>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

