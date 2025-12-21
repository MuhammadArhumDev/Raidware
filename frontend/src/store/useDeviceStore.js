import { create } from "zustand";
import { io } from "socket.io-client";

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

const useDeviceStore = create((set, get) => ({
  socket: null,
  nodes: {},
  sensors: [],
  alerts: [],
  loading: true,

  connectSocket: () => {
    const existingSocket = get().socket;
    if (existingSocket) return;

    const newSocket = io(`${BACKEND_URL}/frontend`, {
      transports: ["websocket"],
    });

    set({ socket: newSocket });

    newSocket.on("connect", () => {
      console.log("Connected to backend socket");
      newSocket.emit("frontend:init");
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
        // If device was offline, maybe we only update status
        const newNode = { ...(prevNodes[data.macAddress] || {}), ...data };

        // Also update alerts if high severity event? (For now just node status)

        return { nodes: { ...prevNodes, [data.macAddress]: newNode } };
      });
    });

    // Listen for alerts and sensor data from backend (if implemented later)
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
