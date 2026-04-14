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

  // Fetch network logs — first from Redis buffer (fast, 30min), then MongoDB fallback
  fetchLogs: async (orgId, token) => {
    if (!orgId || !token) return;
    try {
      // 1. Try MongoDB org-wide logs for historical breadth
      const url = `${BACKEND_URL}/api/devices/logs/${orgId}?limit=100`;
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

  // Load Redis per-device log buffer for all provisioned devices
  fetchRedisLogs: async (macs, token) => {
    if (!macs || !macs.length || !token) return;
    try {
      const results = await Promise.all(
        macs.map((mac) =>
          fetch(`${BACKEND_URL}/api/devices/device-provisioning/netlogs/${mac}?limit=50`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then((r) => (r.ok ? r.json() : { logs: [] }))
        )
      );
      const merged = results.flatMap((r) => r.logs || []);
      // Sort newest first, deduplicate by id
      const seen = new Set();
      const deduped = merged
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .filter((l) => {
          const key = l.id || l.timestamp;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        })
        .slice(0, 200);
      set((state) => ({
        logs: deduped.length > 0 ? deduped : state.logs,
      }));
    } catch (err) {
      console.error("[DeviceStore] Failed to fetch Redis logs:", err);
    }
  },

  // Start polling + socket connection for real-time updates
  startRealtime: (orgId, token) => {
    const store = get();

    // Fetch initial data immediately
    store.fetchDevices(orgId, token);
    store.fetchLogs(orgId, token);

    // After devices load, load Redis log buffer for each device
    setTimeout(() => {
      const macs = Object.keys(get().nodes);
      if (macs.length > 0) get().fetchRedisLogs(macs, token);
    }, 2000);

    // Connect socket for real-time push
    store.connectSocket();

    // Poll devices every 15s as fallback — logs come via WebSocket
    if (store._pollInterval) clearInterval(store._pollInterval);
    const interval = setInterval(() => {
      const { nodes } = get();
      get().fetchDevices(orgId, token);
      // Refresh Redis log buffer periodically
      const macs = Object.keys(nodes);
      if (macs.length > 0) get().fetchRedisLogs(macs, token);
    }, 15000);
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
