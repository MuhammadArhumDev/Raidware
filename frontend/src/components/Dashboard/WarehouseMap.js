"use client";

import { useState, useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import useDeviceStore from "@/store/useDeviceStore";
import { Package, Thermometer, Droplets, Gauge } from "lucide-react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icons in Next.js
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function WarehouseMap() {
  const containersData = useDeviceStore((state) => state.nodes);
  const loading = false;
  const [selectedContainer, setSelectedContainer] = useState(null);

  const containers = Object.entries(containersData).map(([id, container]) => ({
    id,
    ...container,
  }));

  // Default warehouse center (adjust to your actual location)
  const warehouseCenter = [40.7128, -74.006]; // Example: New York

  if (loading) {
    return (
      <div className="h-[600px] bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center">
        <div className="text-gray-500 dark:text-gray-400">Loading map...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Warehouse Map
        </h2>
        <div className="h-[600px] rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
          <MapContainer
            center={warehouseCenter}
            zoom={15}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapUpdater center={warehouseCenter} />
            {containers.map((container) => (
              <Marker
                key={container.id}
                position={[
                  container.latitude || warehouseCenter[0],
                  container.longitude || warehouseCenter[1],
                ]}
                eventHandlers={{
                  click: () => setSelectedContainer(container),
                }}
              >
                <Popup>
                  <div className="p-2">
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Container {container.id}
                    </h3>
                    {container.rfid && (
                      <p className="text-sm text-gray-600 mb-1">
                        <Package className="w-4 h-4 inline mr-1" />
                        RFID: {container.rfid}
                      </p>
                    )}
                    {container.temperature !== undefined && (
                      <p className="text-sm text-gray-600 mb-1">
                        <Thermometer className="w-4 h-4 inline mr-1" />
                        Temp: {container.temperature}°C
                      </p>
                    )}
                    {container.humidity !== undefined && (
                      <p className="text-sm text-gray-600 mb-1">
                        <Droplets className="w-4 h-4 inline mr-1" />
                        Humidity: {container.humidity}%
                      </p>
                    )}
                    {container.pressure !== undefined && (
                      <p className="text-sm text-gray-600">
                        <Gauge className="w-4 h-4 inline mr-1" />
                        Pressure: {container.pressure} hPa
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Container List */}
      {containers.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Active Containers ({containers.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {containers.map((container) => (
              <div
                key={container.id}
                onClick={() => setSelectedContainer(container)}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  selectedContainer?.id === container.id
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-indigo-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-gray-900 dark:text-white">
                    Container {container.id}
                  </h4>
                  <Package className="w-5 h-5 text-indigo-600" />
                </div>
                {container.rfid && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    RFID: {container.rfid}
                  </p>
                )}
                <div className="flex gap-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
                  {container.temperature !== undefined && (
                    <span>🌡️ {container.temperature}°C</span>
                  )}
                  {container.humidity !== undefined && (
                    <span>💧 {container.humidity}%</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
