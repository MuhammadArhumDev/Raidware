"use client";

import { useState, useMemo } from "react";
import useDeviceStore from "@/store/useDeviceStore";
import { AlertTriangle, CheckCircle, XCircle, Info, X } from "lucide-react";
import { format } from "date-fns";

const severityConfig = {
  critical: {
    icon: XCircle,
    color: "red",
    bgColor: "bg-red-50 ",
    borderColor: "border-red-200 ",
    textColor: "text-red-600 ",
  },
  high: {
    icon: AlertTriangle,
    color: "orange",
    bgColor: "bg-orange-50 ",
    borderColor: "border-orange-200 ",
    textColor: "text-orange-600 ",
  },
  medium: {
    icon: Info,
    color: "yellow",
    bgColor: "bg-yellow-50 ",
    borderColor: "border-yellow-200 ",
    textColor: "text-yellow-600 ",
  },
  low: {
    icon: CheckCircle,
    color: "blue",
    bgColor: "bg-blue-50 ",
    borderColor: "border-blue-200 ",
    textColor: "text-black ",
  },
};

export default function AlertsPanel() {
  const allAlerts = useDeviceStore((state) => state.alerts || []);
  const dismissAlert = useDeviceStore((state) => state.dismissAlert);
  const loading = false;
  const [filter, setFilter] = useState("all");

  const alerts = useMemo(() => {
    return allAlerts.sort((a, b) => b.timestamp - a.timestamp);
  }, [allAlerts]);

  const handleDismiss = (alertId) => {
    dismissAlert(alertId);
  };

  const filteredAlerts =
    filter === "all"
      ? alerts
      : alerts.filter((alert) => alert.severity === filter);

  const alertCounts = {
    all: alerts.length,
    critical: alerts.filter((a) => a.severity === "critical").length,
    high: alerts.filter((a) => a.severity === "high").length,
    medium: alerts.filter((a) => a.severity === "medium").length,
    low: alerts.filter((a) => a.severity === "low").length,
  };

  if (loading) {
    return (
      <div className="bg-white  rounded-none shadow-sm p-6">
        <div className="text-gray-500 ">
          Loading alerts...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {}
      <div className="bg-white  rounded-none shadow-sm p-6 border-[1.5px] border-gray-200 ">
        <div className="flex flex-wrap gap-2">
          {Object.entries(alertCounts).map(([key, count]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`
                px-4 py-2 rounded-none font-medium transition-colors
                ${
                  filter === key
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-100  text-gray-700  hover:bg-gray-200 "
                }
              `}
            >
              {key.charAt(0).toUpperCase() + key.slice(1)} ({count})
            </button>
          ))}
        </div>
      </div>

      {}
      <div className="space-y-4">
        {filteredAlerts.length === 0 ? (
          <div className="bg-white  rounded-none shadow-sm p-12 text-center border-[1.5px] border-gray-200 ">
            <CheckCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 ">
              No {filter !== "all" ? filter : ""} alerts at this time
            </p>
          </div>
        ) : (
          filteredAlerts.map((alert) => {
            const config = severityConfig[alert.severity] || severityConfig.low;
            const Icon = config.icon;

            return (
              <div
                key={alert.id}
                className={`
                  bg-white  rounded-none shadow-sm p-6 border-2
                  ${config.borderColor}
                  ${alert.dismissed ? "opacity-60" : ""}
                `}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`p-3 rounded-none ${config.bgColor}`}>
                      <Icon className={`w-6 h-6 ${config.textColor}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 ">
                          {alert.title || "Alert"}
                        </h3>
                        <span
                          className={`
                          px-2 py-1 text-xs font-semibold rounded
                          ${config.bgColor} ${config.textColor}
                        `}
                        >
                          {alert.severity?.toUpperCase()}
                        </span>
                        {alert.dismissed && (
                          <span className="px-2 py-1 text-xs font-semibold rounded-none bg-gray-100  text-gray-600 ">
                            DISMISSED
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600  mb-3">
                        {alert.message ||
                          alert.description ||
                          "No description available"}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-gray-500 ">
                        <span>
                          {format(
                            new Date(alert.timestamp),
                            "MMM dd, yyyy HH:mm:ss"
                          )}
                        </span>
                        {alert.source && <span>• Source: {alert.source}</span>}
                        {alert.nodeId && <span>• Node: {alert.nodeId}</span>}
                      </div>
                    </div>
                  </div>
                  {!alert.dismissed && (
                    <button
                      onClick={() => handleDismiss(alert.id)}
                      className="p-2 hover:bg-gray-100  rounded-none transition-colors"
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
