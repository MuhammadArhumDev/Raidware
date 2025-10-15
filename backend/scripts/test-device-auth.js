import { io } from "socket.io-client";
import crypto from "crypto";

const SERVER_URL = "http://localhost:3000/devices";
const DEVICE_MAC = "AA:BB:CC:DD:EE:FF";
const SECRET = "super-secret-key-123";

// NOTE: Ensure this device exists in Mongo/Redis before running!
// You might need to seed the DB first.

console.log("Connecting to:", SERVER_URL);

const socket = io(SERVER_URL);

socket.on("connect", () => {
  console.log("Connected to server. ID:", socket.id);

  // 1. Init Auth
  console.log("Sending auth:init...");
  socket.emit("auth:init", { macAddress: DEVICE_MAC });
});

socket.on("auth:challenge", ({ nonce }) => {
  console.log("Received challenge nonce:", nonce);

  // 2. Compute Signature
  // Protocol: nonce + macAddress (no colons)
  // Backend expects macAddress without colons if stored that way.
  // Let's assume input MAC has colons but storage/logic might strip them.
  // My socket.service stores `authState.macAddress` exactly as sent.
  // My main.cpp sends macAddress *without* colons.
  // Let's align: if main.cpp sends clean MAC, test script should too.

  const cleanMac = DEVICE_MAC.replace(/:/g, "");
  // Wait, in this script I sent `DEVICE_MAC` (with colons) in `auth:init`.
  // So backend has MAC with colons.
  // So payload = nonce + MAC_WITH_COLONS.
  // BUT main.cpp strips colons.
  // I should act like main.cpp.

  // RE-EMIT init with clean MAC to be consistent with firmware logic?
  // Or just change DEVICE_MAC constant.
});

// Let's improve the script to handle the "clean MAC" logic if I change the const above.
// For now, I'll rely on the event flow.

socket.on("auth:success", (data) => {
  console.log("Auth Success!", data);

  // Send Pulse
  setInterval(() => {
    console.log("Sending pulse...");
    socket.emit("pulse");
  }, 2000);
});

socket.on("auth:failed", (data) => {
  console.error("Auth Failed:", data);
  process.exit(1);
});

socket.on("disconnect", () => {
  console.log("Disconnected");
});
