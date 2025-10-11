'use client';

import { Clock, CheckCircle, AlertTriangle, Network, Shield, Video } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const activityIcons = {
  node: Network,
  alert: AlertTriangle,
  security: Shield,
  cctv: Video,
  system: CheckCircle,
};

export default function ActivityFeed({ activities = [] }) {
  // Mock activities if none provided
  const defaultActivities = [
    {
      id: 'act1',
      type: 'node',
      title: 'Node node1 came online',
      description: 'Mesh network node reconnected',
      timestamp: Date.now() - 300000,
      status: 'success',
    },
    {
      id: 'act2',
      type: 'security',
      title: 'IDS Alert Resolved',
      description: 'Rogue AP threat mitigated',
      timestamp: Date.now() - 600000,
      status: 'success',
    },
    {
      id: 'act3',
      type: 'alert',
      title: 'High Temperature Detected',
      description: 'Sensor reading exceeded threshold',
      timestamp: Date.now() - 900000,
      status: 'warning',
    },
    {
      id: 'act4',
      type: 'cctv',
      title: 'CCTV Camera 2 Activated',
      description: 'Motion detected in loading dock',
      timestamp: Date.now() - 1200000,
      status: 'info',
    },
    {
      id: 'act5',
      type: 'system',
      title: 'Network Configuration Updated',
      description: 'Encryption settings modified',
      timestamp: Date.now() - 1800000,
      status: 'success',
    },
  ];

  const displayActivities = activities.length > 0 ? activities : defaultActivities;

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300';
      case 'warning': return 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300';
      case 'error': return 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300';
      default: return 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300';
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
          Recent Activity
        </h2>
        <Clock className="w-5 h-5 text-gray-400" />
      </div>
      <div className="space-y-4">
        {displayActivities.map((activity, index) => {
          const Icon = activityIcons[activity.type] || CheckCircle;
          return (
            <div key={activity.id} className="flex items-start gap-4">
              <div className={`p-2 rounded-lg ${
                activity.status === 'success' ? 'bg-green-50 dark:bg-green-900/20' :
                activity.status === 'warning' ? 'bg-yellow-50 dark:bg-yellow-900/20' :
                activity.status === 'error' ? 'bg-red-50 dark:bg-red-900/20' :
                'bg-blue-50 dark:bg-blue-900/20'
              }`}>
                <Icon className={`w-5 h-5 ${
                  activity.status === 'success' ? 'text-green-600 dark:text-green-400' :
                  activity.status === 'warning' ? 'text-yellow-600 dark:text-yellow-400' :
                  activity.status === 'error' ? 'text-red-600 dark:text-red-400' :
                  'text-blue-600 dark:text-blue-400'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {activity.title}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {activity.description}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </p>
              </div>
              {index === 0 && (
                <span className="px-2 py-1 text-xs font-semibold rounded-full bg-indigo-100 dark:bg-indigo-900/40 text-indigo-800 dark:text-indigo-300">
                  Latest
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

