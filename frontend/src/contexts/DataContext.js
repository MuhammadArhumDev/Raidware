"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

const DataContext = createContext({});

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const [nodes, setNodes] = useState({});
  const [containers, setContainers] = useState({});
  const [sensors, setSensors] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    // Determine backend URL (env var or default)
    const BACKEND_URL =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

    // Connect to 'frontend' namespace
    const newSocket = io(`${BACKEND_URL}/frontend`, {
      transports: ["websocket"],
    });

    setSocket(newSocket);

    newSocket.on("connect", () => {
      console.log("Connected to backend socket");
      // Request initial data
      newSocket.emit("frontend:init");
    });

    newSocket.on("device:list", (devices) => {
      // Initialize nodes from list
      const nodesMap = {};
      devices.forEach((device) => {
        nodesMap[device.id] = device;
      });
      setNodes(nodesMap);
      setLoading(false);
    });

    newSocket.on("device:update", (data) => {
      setNodes((prev) => {
        const newNode = { ...prev[data.macAddress], ...data };
        // Clean up minimal data
        if (data.status === "offline") {
          // Optional: keep it but mark offline
        }
        return { ...prev, [data.macAddress]: newNode };
      });
    });

    // Handle mock sensors/alerts as fallback/demo data
    // We import this dynamically or assume it's available
    import("@/services/mockData").then(
      ({ mockDataService, reinitializeMockData }) => {
        reinitializeMockData();
        mockDataService.startUpdates();

        // We do NOT subscribe to nodes here, as they come from socket

        mockDataService.subscribe("sensors", (data) => {
          setSensors(data);
        });

        mockDataService.subscribe("alerts", (data) => {
          setAlerts(data);
        });
      }
    );

    return () => {
      newSocket.disconnect();
      import("@/services/mockData").then(({ mockDataService }) => {
        mockDataService.stopUpdates();
      });
    };
  }, []);

  const dismissAlert = (alertId) => {
    // Implement dismiss logic (maybe emit to backend or local only)
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
  };

  const value = {
    nodes,
    containers,
    sensors,
    alerts,
    loading,
    dismissAlert,
    socket,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
