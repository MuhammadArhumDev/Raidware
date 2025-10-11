'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatsCard({ title, value, change, icon: Icon, trend = 'up', color = 'indigo' }) {
  const colorClasses = {
    indigo: {
      iconBg: 'bg-indigo-50 dark:bg-indigo-900/30',
      icon: 'text-indigo-600 dark:text-indigo-400',
      gradient: 'from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-900/10',
    },
    green: {
      iconBg: 'bg-green-50 dark:bg-green-900/30',
      icon: 'text-green-600 dark:text-green-400',
      gradient: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-900/10',
    },
    red: {
      iconBg: 'bg-red-50 dark:bg-red-900/30',
      icon: 'text-red-600 dark:text-red-400',
      gradient: 'from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-900/10',
    },
    blue: {
      iconBg: 'bg-blue-50 dark:bg-blue-900/30',
      icon: 'text-blue-600 dark:text-blue-400',
      gradient: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-900/10',
    },
  };

  const colors = colorClasses[color] || colorClasses.indigo;

  return (
    <div className={`bg-gradient-to-br ${colors.gradient} rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 ${colors.iconBg} rounded-lg`}>
          <Icon className={`w-6 h-6 ${colors.icon}`} />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
            trend === 'up' 
              ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300' 
              : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300'
          }`}>
            {trend === 'up' ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            <span>{Math.abs(change)}%</span>
          </div>
        )}
      </div>
      <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
        {value}
      </h3>
      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {title}
      </p>
    </div>
  );
}

