'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

export default function StatsCard({ title, value, change, icon: Icon, trend = 'up', color = 'indigo' }) {
  const colorClasses = {
    indigo: {
      iconBg: 'bg-indigo-50 ',
      icon: 'text-black ',
      gradient: 'from-indigo-50 to-indigo-100  ',
    },
    green: {
      iconBg: 'bg-green-50 ',
      icon: 'text-black ',
      gradient: 'from-green-50 to-green-100  ',
    },
    red: {
      iconBg: 'bg-red-50 ',
      icon: 'text-black ',
      gradient: 'from-red-50 to-red-100  ',
    },
    blue: {
      iconBg: 'bg-blue-50 ',
      icon: 'text-black ',
      gradient: 'from-blue-50 to-blue-100  ',
    },
  };

  const colors = colorClasses[color] || colorClasses.indigo;

  return (
    <div className={`bg-gradient-to-br ${colors.gradient} rounded-none shadow-sm p-6 border-[1.5px] border-gray-200  hover:shadow-md transition-shadow`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 ${colors.iconBg} rounded-none`}>
          <Icon className={`w-6 h-6 ${colors.icon}`} />
        </div>
        {change !== undefined && (
          <div className={`flex items-center gap-1 px-2 py-1 rounded-none text-xs font-semibold ${
            trend === 'up' 
              ? 'bg-green-100  text-green-700 ' 
              : 'bg-red-100  text-red-700 '
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
      <h3 className="text-3xl font-bold text-gray-900  mb-1">
        {value}
      </h3>
      <p className="text-sm font-medium text-gray-700 ">
        {title}
      </p>
    </div>
  );
}

