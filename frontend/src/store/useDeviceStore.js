"use client";

import { create } from "zustand";
import { io } from "socket.io-client";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:5000";

// ── Client-side per-device liveness timers ───────────────────────────────────
// Kept OUTSIDE Zustand so they are never serialized or reset by store updates.
// Logic: every time we see a device online (socket OR REST), we reset its 60s
// timer. If 60s pass with no heartbeat, we mark the device offline in the UI.
const _livenessTimers = new Map(); // mac → timeoutId

function resetLivenessTimer(mac, setState) {
  // Cancel any existing countdown for this device
  if (_livenessTimers.has(mac)) {
    clearTimeout(_livenessTimers.get(mac));
  }

  // Stamp lastSeen = now in the UI so the display stays fresh even though
  // MongoDB only writes every 30s (throttled). This is purely a display update.
  setState((state) => {
    if (!state.nodes[mac]) return {};
    return {
      nodes: {
        ...state.nodes,
        [mac]: { ...state.nodes[mac], lastSeen: new Date().toISOString() },
      },
    };
  });

  // Start a fresh 60-second countdown
  const id = setTimeout(() => {
    _livenessTimers.delete(mac);
    console.log(`[DeviceStore] Liveness timer expired for ${mac} — no heartbeat in 60s, marking offline`);
    setState((state) => {
      if (!state.nodes[mac]) return {};
      return {
        nodes: {
          ...state.nodes,
          [mac]: { ...state.nodes[mac], status: "offline" },
        },
      };
    });
  }, 60_000);

  _livenessTimers.set(mac, id);
}

function clearAllLivenessTimers() {
  _livenessTimers.forEach((id) => clearTimeout(id));
  _livenessTimers.clear();
}

// ── Store ────────────────────────────────────────────────────────────────────
const useDeviceStore = create((set, get) => ({
  socket: null,
  nodes: {},
  sensors: [],
  alerts: [],
  logs: [],
  loading: true,
  _pollInterval: null,
  _lastSocketTopologyAt: 0,

  // Fetch devices from REST API — display/fallback only.
  // Does NOT reset liveness timers — only socket topology:update events are
  // authoritative for heartbeat liveness. REST resetting timers caused devices
  // to stay in stale/yellow indefinitely (never transitioning to offline).
  fetchDevices: async (orgId, token) => {
    if (!orgId || !token) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/devices/topology/${orgId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const newDevices = data.devices || [];

        set((state) => {
          // MERGE — never replace the whole map.
          // Prefer the fresher lastSeen: keep socket-stamped value if it's newer
          // than what MongoDB returned (avoids stale DB timestamp overwriting fresh UI value).
          const merged = { ...state.nodes };
          newDevices.forEach((device) => {
            const mac = device.mac || device.id;
            const existing = merged[mac];
            const existingTs = existing?.lastSeen ? new Date(existing.lastSeen).getTime() : 0;
            const incomingTs = device.lastSeen  ? new Date(device.lastSeen).getTime()  : 0;
            merged[mac] = {
              ...device,
              // Keep the fresher lastSeen so socket-stamped "now" isn't overwritten
              lastSeen: existingTs > incomingTs ? existing.lastSeen : device.lastSeen,
            };
          });
          return { nodes: merged, loading: false };
        });
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
      const redisLogs = results.flatMap((r) => r.logs || []);

      set((state) => {
        const seen = new Set();
        const merged = [...redisLogs, ...state.logs]
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .filter((l) => {
            const key = String(l.id || l._id || `${l.timestamp}-${l.srcIp}`);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .slice(0, 200);
        return { logs: merged };
      });
    } catch (err) {
      console.error("[DeviceStore] Failed to fetch Redis logs:", err);
    }
  },

  startRealtime: (orgId, token) => {
    const store = get();

    store.fetchDevices(orgId, token);
    store.fetchLogs(orgId, token);

    setTimeout(() => {
      const macs = Object.keys(get().nodes);
      if (macs.length > 0) get().fetchRedisLogs(macs, token);
    }, 2000);

    store.connectSocket(orgId);

    if (store._pollInterval) clearInterval(store._pollInterval);
    const interval = setInterval(() => {
      const { nodes } = get();
      get().fetchDevices(orgId, token);
      const macs = Object.keys(nodes);
      if (macs.length > 0) get().fetchRedisLogs(macs, token);
    }, 15000);
    set({ _pollInterval: interval });
  },

  stopRealtime: () => {
    const store = get();
    // Clear all per-device liveness timers
    clearAllLivenessTimers();
    if (store._pollInterval) {
      clearInterval(store._pollInterval);
      set({ _pollInterval: null });
    }
    store.disconnectSocket();
  },

  connectSocket: (orgId) => {
    const existingSocket = get().socket;
    if (existingSocket) return;

    const newSocket = io(BACKEND_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 2000,
    });

    set({ socket: newSocket });

    newSocket.on("connect", () => {
      console.log("[DeviceStore] Socket connected to", BACKEND_URL);
      if (orgId) {
        newSocket.emit("join:org", orgId);
        console.log("[DeviceStore] Joined org room:", orgId);
      }
    });

    newSocket.on("reconnect", () => {
      if (orgId) newSocket.emit("join:org", orgId);
    });

    newSocket.on("connect_error", (err) => {
      console.warn("[DeviceStore] Socket connection error:", err.message);
    });

    // ── topology:update ───────────────────────────────────────────────────────
    // Liveness timer is the SOLE authority for offline transitions.
    // Order: (1) merge MongoDB data, (2) stamp lastSeen=now via resetLivenessTimer.
    // This ensures the fresh timestamp wins over MongoDB's 30s-throttled value,
    // so the 45s stale threshold gives exactly 15s of yellow before 60s offline.
    newSocket.on("topology:update", (data) => {
      if (data && data.devices) {
        // Step 1: merge MongoDB data into nodes
        set((state) => {
          const merged = { ...state.nodes };
          data.devices.forEach((device) => {
            merged[device.mac || device.id] = device;
          });
          return { nodes: merged, loading: false, _lastSocketTopologyAt: Date.now() };
        });

        // Step 2: for each online device, reset the 60s timer AND stamp lastSeen=now
        // (runs after the merge so the fresh timestamp overwrites MongoDB's stale value)
        data.devices.forEach((device) => {
          const mac = device.mac || device.id;
          if (device.status === "online") {
            resetLivenessTimer(mac, set);
          }
        });
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
