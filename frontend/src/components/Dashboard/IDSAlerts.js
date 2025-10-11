'use client';

import { useState, useMemo } from 'react';
import { useData } from '@/contexts/DataContext';
import { AlertTriangle, CheckCircle, XCircle, Info, X, Shield, Network, Lock } from 'lucide-react';
import { format } from 'date-fns';

const severityConfig = {
  critical: {
    icon: XCircle,
    color: 'red',
    bgColor: 'bg-red-50 dark:bg-red-900/20',
    borderColor: 'border-red-200 dark:border-red-800',
    textColor: 'text-red-600 dark:text-red-400',
  },
  high: {
    icon: AlertTriangle,
    color: 'orange',
    bgColor: 'bg-orange-50 dark:bg-orange-900/20',
    borderColor: 'border-orange-200 dark:border-orange-800',
    textColor: 'text-orange-600 dark:text-orange-400',
  },
  medium: {
    icon: Info,
    color: 'yellow',
    bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
    borderColor: 'border-yellow-200 dark:border-yellow-800',
    textColor: 'text-yellow-600 dark:text-yellow-400',
  },
  low: {
    icon: CheckCircle,
    color: 'blue',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-200 dark:border-blue-800',
    textColor: 'text-blue-600 dark:text-blue-400',
  },
};

const attackTypes = {
  'rogue-ap': { icon: Network, label: 'Rogue Access Point Detected' },
  'arp-spoofing': { icon: Network, label: 'ARP Spoofing Attack' },
  'deauth-attack': { icon: Lock, label: 'Deauthentication Attack' },
  'brute-force': { icon: Shield, label: 'Brute Force Attempt' },
  'unauthorized-access': { icon: XCircle, label: 'Unauthorized Access' },
  'data-exfiltration': { icon: AlertTriangle, label: 'Data Exfiltration Attempt' },
};

export default function IDSAlerts() {
  const { alerts: allAlerts, dismissAlert, loading } = useData();
  const [filter, setFilter] = useState('all');
  const [attackTypeFilter, setAttackTypeFilter] = useState('all');

  // Enhance alerts with attack type information
  const enhancedAlerts = useMemo(() => {
    return allAlerts.map(alert => {
      // Detect attack type from alert source/message
      let attackType = 'unknown';
      const message = alert.message?.toLowerCase() || '';
      
      if (message.includes('rogue') || message.includes('unauthorized ap')) {
        attackType = 'rogue-ap';
      } else if (message.includes('arp') || message.includes('spoofing')) {
        attackType = 'arp-spoofing';
      } else if (message.includes('deauth') || message.includes('deauthentication')) {
        attackType = 'deauth-attack';
      } else if (message.includes('brute') || message.includes('force')) {
        attackType = 'brute-force';
      } else if (message.includes('unauthorized') || message.includes('access')) {
        attackType = 'unauthorized-access';
      } else if (message.includes('exfiltrat') || message.includes('data leak')) {
        attackType = 'data-exfiltration';
      }

      return {
        ...alert,
        attackType,
      };
    });
  }, [allAlerts]);

  const alerts = useMemo(() => {
    let filtered = enhancedAlerts.sort((a, b) => b.timestamp - a.timestamp);
    
    if (filter !== 'all') {
      filtered = filtered.filter(alert => alert.severity === filter);
    }
    
    if (attackTypeFilter !== 'all') {
      filtered = filtered.filter(alert => alert.attackType === attackTypeFilter);
    }
    
    return filtered;
  }, [enhancedAlerts, filter, attackTypeFilter]);

  const alertCounts = {
    all: enhancedAlerts.length,
    critical: enhancedAlerts.filter(a => a.severity === 'critical').length,
    high: enhancedAlerts.filter(a => a.severity === 'high').length,
    medium: enhancedAlerts.filter(a => a.severity === 'medium').length,
    low: enhancedAlerts.filter(a => a.severity === 'low').length,
  };

  const attackTypeCounts = {
    all: enhancedAlerts.length,
    'rogue-ap': enhancedAlerts.filter(a => a.attackType === 'rogue-ap').length,
    'arp-spoofing': enhancedAlerts.filter(a => a.attackType === 'arp-spoofing').length,
    'deauth-attack': enhancedAlerts.filter(a => a.attackType === 'deauth-attack').length,
    'brute-force': enhancedAlerts.filter(a => a.attackType === 'brute-force').length,
    'unauthorized-access': enhancedAlerts.filter(a => a.attackType === 'unauthorized-access').length,
    'data-exfiltration': enhancedAlerts.filter(a => a.attackType === 'data-exfiltration').length,
  };

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="text-gray-500 dark:text-gray-400">Loading IDS alerts...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3 mb-4">
          <Shield className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Intrusion Detection System (IDS)
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Real-time monitoring of network attacks and security threats
            </p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Severity</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(alertCounts).map(([key, count]) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`
                  px-4 py-2 rounded-lg font-medium transition-colors text-sm
                  ${filter === key
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }
                `}
              >
                {key.charAt(0).toUpperCase() + key.slice(1)} ({count})
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Attack Type</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(attackTypeCounts).map(([key, count]) => {
              if (key === 'all') {
                return (
                  <button
                    key={key}
                    onClick={() => setAttackTypeFilter(key)}
                    className={`
                      px-4 py-2 rounded-lg font-medium transition-colors text-sm
                      ${attackTypeFilter === key
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }
                    `}
                  >
                    All Attacks ({count})
                  </button>
                );
              }
              const attackInfo = attackTypes[key];
              if (!attackInfo || count === 0) return null;
              return (
                <button
                  key={key}
                  onClick={() => setAttackTypeFilter(key)}
                  className={`
                    px-4 py-2 rounded-lg font-medium transition-colors text-sm flex items-center gap-2
                    ${attackTypeFilter === key
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }
                  `}
                >
                  <attackInfo.icon className="w-4 h-4" />
                  {attackInfo.label} ({count})
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-4">
        {alerts.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-12 text-center border border-gray-200 dark:border-gray-700">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              No {filter !== 'all' || attackTypeFilter !== 'all' ? 'matching ' : ''}IDS alerts at this time
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              Your network is secure
            </p>
          </div>
        ) : (
          alerts.map((alert) => {
            const config = severityConfig[alert.severity] || severityConfig.low;
            const Icon = config.icon;
            const attackInfo = attackTypes[alert.attackType] || { icon: Shield, label: 'Security Alert' };
            const AttackIcon = attackInfo.icon;
            
            return (
              <div
                key={alert.id}
                className={`
                  bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border-2
                  ${config.borderColor}
                  ${alert.dismissed ? 'opacity-60' : ''}
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-lg ${config.bgColor}`}>
                      <Icon className={`w-6 h-6 ${config.textColor}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <AttackIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {alert.title || attackInfo.label}
                          </h3>
                        </div>
                        <span className={`
                          px-2 py-1 text-xs font-semibold rounded
                          ${config.bgColor} ${config.textColor}
                        `}>
                          {alert.severity?.toUpperCase()}
                        </span>
                        {alert.dismissed && (
                          <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                            DISMISSED
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 dark:text-gray-400 mb-3">
                        {alert.message || alert.description || 'Network security threat detected'}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-500">
                        <span>
                          {format(new Date(alert.timestamp), 'MMM dd, yyyy HH:mm:ss')}
                        </span>
                        {alert.source && (
                          <span>• Source: {alert.source}</span>
                        )}
                        {alert.nodeId && (
                          <span>• Node: {alert.nodeId}</span>
                        )}
                        {alert.attackType && alert.attackType !== 'unknown' && (
                          <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-xs">
                            {attackInfo.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {!alert.dismissed && (
                    <button
                      onClick={() => dismissAlert(alert.id)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                      title="Dismiss alert"
                    >
                      <X className="w-5 h-5 text-gray-400" />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

