"use client";

import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import useDeviceStore from "@/store/useDeviceStore";
import { Thermometer, Droplets, Gauge } from "lucide-react";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function SensorCharts() {
  const sensorData = useDeviceStore((state) => state.sensors || []);
  const loading = false;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
      },
      tooltip: {
        mode: "index",
        intersect: false,
      },
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: {
          color: "rgba(0, 0, 0, 0.05)",
        },
      },
      x: {
        grid: {
          display: false,
        },
      },
    },
  };

  const timeLabels = sensorData.map((_, index) => {
    const date = new Date(sensorData[index]?.timestamp || Date.now());
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  });

  const temperatureData = {
    labels: timeLabels,
    datasets: [
      {
        label: "Temperature (°C)",
        data: sensorData.map((s) => s.temperature || 0),
        borderColor: "rgb(239, 68, 68)",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const humidityData = {
    labels: timeLabels,
    datasets: [
      {
        label: "Humidity (%)",
        data: sensorData.map((s) => s.humidity || 0),
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const pressureData = {
    labels: timeLabels,
    datasets: [
      {
        label: "Pressure (hPa)",
        data: sensorData.map((s) => s.pressure || 0),
        borderColor: "rgb(34, 197, 94)",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const currentReading = sensorData[sensorData.length - 1] || {};

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <div className="text-gray-500 dark:text-gray-400">
          Loading sensor data...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Readings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-red-50 dark:bg-red-900/30 rounded-lg">
              <Thermometer className="w-6 h-6 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {currentReading.temperature?.toFixed(1) || "N/A"}°C
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Temperature
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
              <Droplets className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {currentReading.humidity?.toFixed(1) || "N/A"}%
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Humidity</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-50 dark:bg-green-900/30 rounded-lg">
              <Gauge className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
            {currentReading.pressure?.toFixed(1) || "N/A"} hPa
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Pressure</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Temperature Trend
          </h3>
          <div className="h-64">
            <Line data={temperatureData} options={chartOptions} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Humidity Trend
          </h3>
          <div className="h-64">
            <Line data={humidityData} options={chartOptions} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700 lg:col-span-2">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Pressure Trend
          </h3>
          <div className="h-64">
            <Line data={pressureData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}
