"use client";

import { create } from "zustand";
import { io } from "socket.io-client";

// Use the same backend URL for both REST and Socket.IO
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000";

const useDeviceStore = create((set, get) => ({
  socket: null,
  nodes: {},
  sensors: [],
  alerts: [],
  logs: [],
  loading: true,
  _pollInterval: null,

  // Fetch devices from REST API (real data from MongoDB)
  fetchDevices: async (orgId, token) => {
    if (!orgId || !token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/devices/topology/${orgId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const nodesMap = {};
        (data.devices || []).forEach((device) => {
          nodesMap[device.mac || device.id] = device;
        });
        set({ nodes: nodesMap, loading: false });
      }
    } catch (err) {
      console.error("[DeviceStore] Failed to fetch devices:", err);
      set({ loading: false });
    }
  },

  // Fetch network logs from REST API
  fetchLogs: async (orgId, token, alertsOnly = false) => {
    if (!orgId || !token) return;
    try {
      const url = alertsOnly
        ? `${BACKEND_URL}/api/devices/logs/${orgId}/alerts?limit=50`
        : `${BACKEND_URL}/api/devices/logs/${orgId}?limit=50`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        set({ logs: data.logs || [] });
      }
    } catch (err) {
      console.error("[DeviceStore] Failed to fetch logs:", err);
    }
  },

  // Start polling + socket connection for real-time updates
  startRealtime: (orgId, token) => {
    const store = get();

    // Fetch initial data immediately
    store.fetchDevices(orgId, token);
    store.fetchLogs(orgId, token);

    // Connect socket for real-time push
    store.connectSocket();

    // Also poll every 10 seconds as fallback
    if (store._pollInterval) clearInterval(store._pollInterval);
    const interval = setInterval(() => {
      get().fetchDevices(orgId, token);
      get().fetchLogs(orgId, token);
    }, 10000);
    set({ _pollInterval: interval });
  },

  stopRealtime: () => {
    const store = get();
    if (store._pollInterval) {
      clearInterval(store._pollInterval);
      set({ _pollInterval: null });
    }
    store.disconnectSocket();
  },

  connectSocket: () => {
    const existingSocket = get().socket;
    if (existingSocket) return;

    // Connect to the SAME backend for Socket.IO
    const newSocket = io(BACKEND_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 2000,
    });

    set({ socket: newSocket });

    newSocket.on("connect", () => {
      console.log("[DeviceStore] Socket connected to", BACKEND_URL);
    });

    newSocket.on("connect_error", (err) => {
      console.warn("[DeviceStore] Socket connection error:", err.message);
    });

    // Real-time topology updates (from heartbeats)
    newSocket.on("topology:update", (data) => {
      if (data && data.devices) {
        const nodesMap = {};
        data.devices.forEach((device) => {
          nodesMap[device.mac || device.id] = device;
        });
        set({ nodes: nodesMap, loading: false });
      }
    });

    // Real-time network log updates
    newSocket.on("network:log:new", (data) => {
      if (data && data.log) {
        set((state) => {
          const newLogs = [data.log, ...state.logs].slice(0, 100);
          return { logs: newLogs };
        });
      }
    });

    newSocket.on("device:list", (devices) => {
      const nodesMap = {};
      devices.forEach((device) => {
        nodesMap[device.id] = device;
      });
      set({ nodes: nodesMap, loading: false });
    });

    newSocket.on("device:update", (data) => {
      set((state) => {
        const prevNodes = state.nodes;
        const newNode = { ...(prevNodes[data.macAddress] || {}), ...data };
        return { nodes: { ...prevNodes, [data.macAddress]: newNode } };
      });
    });

    newSocket.on("dashboard:alerts", (newAlerts) => {
      set({ alerts: newAlerts });
    });

    newSocket.on("dashboard:sensors", (newSensors) => {
      set({ sensors: newSensors });
    });
  },

  disconnectSocket: () => {
    const socket = get().socket;
    if (socket) socket.disconnect();
    set({ socket: null });
  },

  dismissAlert: (alertId) => {
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== alertId),
    }));
  },
}));

export default useDeviceStore;
