"use client";

import { useState } from "react";
import useDeviceStore from "@/store/useDeviceStore";
import { Send, Lock, CheckCircle, AlertCircle } from "lucide-react";

export default function MessageSender() {
  const { nodes, socket } = useDeviceStore();
  const [selectedDevice, setSelectedDevice] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', text: string }

  const handleSend = () => {
    if (!message.trim() || !selectedDevice) return;

    if (!socket) {
      setStatus({ type: "error", text: "Socket not connected" });
      return;
    }

    // Emit event to backend
    socket.emit("frontend:send_message", {
      targetMac: selectedDevice,
      message: message,
    });

    setStatus({ type: "sending", text: "Encrypting with Kyber..." });

    // Listen for acknowledgment (one-off)
    socket.once("message:status", (response) => {
      if (response.target === selectedDevice) {
        if (response.success) {
          setStatus({ type: "success", text: "Encrypted & Sent!" });
          setMessage("");
        } else {
          setStatus({ type: "error", text: `Failed: ${response.reason}` });
        }

        // Clear status after 3s
        setTimeout(() => setStatus(null), 3000);
      }
    });
  };

  const onlineDevices = Object.values(nodes).filter(
    (n) => n.status === "online"
  );

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-indigo-600 rounded-lg">
          <Send className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Secure Message Relay
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Send Kyber-encrypted commands to firmware
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Device
          </label>
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">-- Choose Online Device --</option>
            {onlineDevices.map((device) => (
              <option key={device.id} value={device.macAddress}>
                {device.name || device.macAddress} ({device.status})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Message
          </label>
          <div className="relative">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="e.g., REBOOT, UPDATE_CONFIG"
              className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
            />
            <Lock className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
          </div>
        </div>

        <button
          onClick={handleSend}
          disabled={!selectedDevice || !message || status?.type === "sending"}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2
            ${
              !selectedDevice || !message
                ? "bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/30"
            }`}
        >
          {status?.type === "sending" ? "Encrypting..." : "Send Secure Message"}
        </button>

        {status && (
          <div
            className={`flex items-center gap-2 text-sm p-3 rounded-lg ${
              status.type === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : status.type === "error"
                ? "bg-red-50 text-red-700 border border-red-200"
                : "bg-blue-50 text-blue-700 border border-blue-200"
            }`}
          >
            {status.type === "success" && <CheckCircle className="w-4 h-4" />}
            {status.type === "error" && <AlertCircle className="w-4 h-4" />}
            {status.text}
          </div>
        )}
      </div>
    </div>
  );
}
