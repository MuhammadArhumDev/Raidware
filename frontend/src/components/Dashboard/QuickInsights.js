'use client';

import { Lightbulb, TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

export default function QuickInsights({ insights = [] }) {
  const defaultInsights = [
    {
      id: 'insight1',
      type: 'success',
      title: 'Network Performance Optimal',
      message: 'All nodes operating within normal parameters',
      icon: CheckCircle,
    },
    {
      id: 'insight2',
      type: 'info',
      title: 'Security Score: 96%',
      message: 'Your network security is above average',
      icon: TrendingUp,
    },
    {
      id: 'insight3',
      type: 'warning',
      title: 'Temperature Alert',
      message: 'Consider checking sensor calibration in Zone 2',
      icon: AlertCircle,
    },
  ];

  const displayInsights = insights.length > 0 ? insights : defaultInsights;

  const getTypeStyles = (type) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50 ',
          border: 'border-green-200 ',
          icon: 'text-green-600 ',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50 ',
          border: 'border-yellow-200 ',
          icon: 'text-yellow-600 ',
        };
      case 'error':
        return {
          bg: 'bg-red-50 ',
          border: 'border-red-200 ',
          icon: 'text-red-600 ',
        };
      default:
        return {
          bg: 'bg-blue-50 ',
          border: 'border-blue-200 ',
          icon: 'text-black ',
        };
    }
  };

  return (
    <div className="bg-white  rounded-none shadow-sm p-6 border-[1.5px] border-gray-200 ">
      <div className="flex items-center gap-3 mb-6">
        <Lightbulb className="w-6 h-6 text-indigo-600 " />
        <h2 className="text-xl font-semibold text-gray-900 ">
          Quick Insights
        </h2>
      </div>
      <div className="space-y-3">
        {displayInsights.map((insight) => {
          const Icon = insight.icon || Lightbulb;
          const styles = getTypeStyles(insight.type);
          return (
            <div
              key={insight.id}
              className={`p-4 rounded-none border ${styles.bg} ${styles.border}`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-5 h-5 mt-0.5 ${styles.icon}`} />
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-900  mb-1">
                    {insight.title}
                  </h3>
                  <p className="text-sm text-gray-600 ">
                    {insight.message}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

