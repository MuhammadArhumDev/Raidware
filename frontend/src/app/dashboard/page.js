'use client';

import { useEffect, useState } from 'react';
import { useData } from '@/contexts/DataContext';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import StatsCard from '@/components/Dashboard/StatsCard';
import MetricChart from '@/components/Dashboard/MetricChart';
import RealTimeChart from '@/components/Dashboard/RealTimeChart';
import { Network, Video, Activity, Shield, TrendingUp, Users, Wifi, Lock, Server } from 'lucide-react';
import { useMemo } from 'react';
import ActivityFeed from '@/components/Dashboard/ActivityFeed';
import PerformanceMetrics from '@/components/Dashboard/PerformanceMetrics';
import QuickInsights from '@/components/Dashboard/QuickInsights';

// Memoized sensor chart component to prevent re-renders
function SensorDataChart({ sensors }) {
  const sensorData = useMemo(() => {
    const sensorLabels = sensors.slice(-20).map((_, i) => {
      const timestamp = sensors[sensors.length - 20 + i]?.timestamp || Date.now();
      return new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    });
    return {
      labels: sensorLabels,
      datasets: [
        {
          label: 'Temperature (°C)',
          data: sensors.slice(-20).map(s => s.temperature || 0),
          borderColor: 'rgba(239, 68, 68, 1)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
          fill: true,
          yAxisID: 'y',
        },
        {
          label: 'Humidity (%)',
          data: sensors.slice(-20).map(s => s.humidity || 0),
          borderColor: 'rgba(59, 130, 246, 1)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true,
          yAxisID: 'y1',
        },
      ],
    };
  }, [sensors]);

  return (
    <RealTimeChart
      type="line"
      height={300}
      title="Sensor Data Overview - Temperature & Humidity"
      data={sensorData}
    />
  );
}

export default function DashboardPage() {
  const { nodes, containers, alerts, sensors } = useData();
  const [networkHealth, setNetworkHealth] = useState(95);
  const [networkHealthHistory, setNetworkHealthHistory] = useState([]);
  const [nodeCountHistory, setNodeCountHistory] = useState([]);
  const [alertCountHistory, setAlertCountHistory] = useState([]);

  useEffect(() => {
    // Calculate network health based on node status
    const calculateNetworkHealth = () => {
      const nodeCount = Object.keys(nodes).length;
      if (nodeCount === 0) {
        return 0;
      }
      const onlineNodes = Object.values(nodes).filter(
        node => node.status === 'online' && Date.now() - node.lastSeen < 60000
      ).length;
      const health = Math.min(95 + Math.random() * 5, 100); // Simulate 95-100% health
      return health;
    };

    // Initial calculation
    const initialHealth = calculateNetworkHealth();
    setNetworkHealth(initialHealth);
    
    // Update history initially
    const now = Date.now();
    setNetworkHealthHistory([{ timestamp: now, value: initialHealth }]);
    setNodeCountHistory([{ timestamp: now, value: Object.keys(nodes).length }]);
    setAlertCountHistory([{ timestamp: now, value: alerts.length }]);
    
    // Set up interval for updates
    const updateInterval = setInterval(() => {
      const health = calculateNetworkHealth();
      setNetworkHealth(health);
      
      const updateTime = Date.now();
      setNetworkHealthHistory(prev => {
        const newHistory = [...prev, { timestamp: updateTime, value: health }];
        return newHistory.slice(-30); // Keep last 30 points
      });
      setNodeCountHistory(prev => {
        const currentNodeCount = Object.keys(nodes).length;
        const newHistory = [...prev, { timestamp: updateTime, value: currentNodeCount }];
        return newHistory.slice(-30);
      });
      setAlertCountHistory(prev => {
        const currentAlertCount = alerts.length;
        const newHistory = [...prev, { timestamp: updateTime, value: currentAlertCount }];
        return newHistory.slice(-30);
      });
    }, 5000);
    
    return () => {
      clearInterval(updateInterval);
    };
  }, [nodes, alerts]); // Removed networkHealth from dependencies to prevent infinite loop

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Dashboard Overview
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Cloud platform for secure IoT network management with CCTV, sensors, and IDS protection
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatsCard
            icon={Network}
            title="Active Nodes"
            value={Object.keys(nodes).length}
            change={2.5}
            trend="up"
            color="indigo"
          />
          <StatsCard
            icon={Video}
            title="CCTV Live Streams"
            value={4}
            change={0}
            trend="up"
            color="blue"
          />
          <StatsCard
            icon={Activity}
            title="Network Health"
            value={`${networkHealth.toFixed(1)}%`}
            change={-1.2}
            trend="down"
            color="green"
          />
          <StatsCard
            icon={Shield}
            title="Active Alerts"
            value={alerts.length}
            color="red"
          />
        </div>

        {/* Real-time Charts - Main Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <MetricChart
              title="Network Health Trend"
              dataSource={networkHealthHistory}
              dataKey="value"
              color="green"
              type="area"
              height={280}
              unit="%"
              gradient={true}
            />
          </div>
          <div className="space-y-6">
            <QuickInsights />
          </div>
        </div>

        {/* Secondary Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MetricChart
            title="Active Nodes Count"
            dataSource={nodeCountHistory}
            dataKey="value"
            color="indigo"
            type="line"
            height={250}
            unit=" nodes"
          />
          <MetricChart
            title="Active Alerts Trend"
            dataSource={alertCountHistory}
            dataKey="value"
            color="red"
            type="bar"
            height={250}
            unit=" alerts"
          />
        </div>

        {/* Sensor Data Chart */}
        {sensors && sensors.length > 0 && (
          <SensorDataChart sensors={sensors} />
        )}

        {/* Performance Metrics & Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PerformanceMetrics />
          <ActivityFeed />
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <a
              href="/dashboard/cctv"
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                CCTV Live Streams
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Monitor all CCTV cameras in real-time
              </p>
            </a>
            <a
              href="/dashboard/sensors"
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                Sensor Data
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Monitor environmental conditions
              </p>
            </a>
            <a
              href="/dashboard/alerts"
              className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                View Alerts
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Check security and system alerts
              </p>
            </a>
          </div>
        </div>

        {/* System Status & Network Info */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              System Status
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-600 rounded-lg">
                    <Wifi className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Mesh Network</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">All nodes connected</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full text-sm font-medium">
                  Operational
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-600 rounded-lg">
                    <Server className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Gateway Connection</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Raspberry Pi gateway</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full text-sm font-medium">
                  Connected
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-600 rounded-lg">
                    <Activity className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Data Sync</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Real-time updates</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300 rounded-full text-sm font-medium">
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-yellow-600 rounded-lg">
                    <Shield className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Intrusion Detection</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">IDS monitoring active</p>
                  </div>
                </div>
                <span className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300 rounded-full text-sm font-medium">
                  Monitoring
                </span>
              </div>
            </div>
          </div>

          {/* Network Security Status */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Security Status
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Encryption</span>
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">AES-256</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Mutual Authentication</span>
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">Enabled</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">MAC Whitelisting</span>
                  <span className="text-sm font-semibold text-green-600 dark:text-green-400">Active</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Overall Security Score</span>
                  <span className="text-2xl font-bold text-green-600 dark:text-green-400">96%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

