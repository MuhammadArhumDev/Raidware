'use client';

import { Clock, CheckCircle, AlertTriangle, Network, Shield, Video } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

const activityIcons = {
  node: Network,
  alert: AlertTriangle,
  security: Shield,
  system: CheckCircle,
};

export default function ActivityFeed({ activities = [] }) {
  const displayActivities = activities;

  const getStatusColor = (status) => {
    switch (status) {
      case 'success': return 'bg-green-100  text-green-800 ';
      case 'warning': return 'bg-yellow-100  text-yellow-800 ';
      case 'error': return 'bg-red-100  text-red-800 ';
      default: return 'bg-blue-100  text-blue-800 ';
    }
  };

  return (
    <div className="bg-white  rounded-none shadow-sm p-6 border-[1.5px] border-gray-200 ">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900 ">
          Recent Activity
        </h2>
        <Clock className="w-5 h-5 text-gray-400" />
      </div>
      <div className="space-y-4">
        {displayActivities.map((activity, index) => {
          const Icon = activityIcons[activity.type] || CheckCircle;
          return (
            <div key={activity.id} className="flex items-start gap-4">
              <div className={`p-2 rounded-none ${
                activity.status === 'success' ? 'bg-green-50 ' :
                activity.status === 'warning' ? 'bg-yellow-50 ' :
                activity.status === 'error' ? 'bg-red-50 ' :
                'bg-blue-50 '
              }`}>
                <Icon className={`w-5 h-5 ${
                  activity.status === 'success' ? 'text-green-600 ' :
                  activity.status === 'warning' ? 'text-yellow-600 ' :
                  activity.status === 'error' ? 'text-red-600 ' :
                  'text-black '
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 ">
                  {activity.title}
                </p>
                <p className="text-sm text-gray-600  mt-1">
                  {activity.description}
                </p>
                <p className="text-xs text-gray-500  mt-2">
                  {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                </p>
              </div>
              {index === 0 && (
                <span className="px-2 py-1 text-xs font-semibold rounded-none bg-indigo-100  text-indigo-800 ">
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

