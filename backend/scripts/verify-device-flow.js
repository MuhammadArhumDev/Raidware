import { io } from "socket.io-client";
import crypto from "crypto";
import fetch from "node-fetch";

const API_URL = "http://localhost:5000/api/devices";
const SOCKET_URL = "http://localhost:5000";

const deviceId = "test-device-" + Math.floor(Math.random() * 1000);
let keyPair;

async function generateKeys() {
  return new Promise((resolve, reject) => {
    crypto.generateKeyPair(
      "ec",
      {
        namedCurve: "secp256k1",
        publicKeyEncoding: { type: "spki", format: "pem" },
        privateKeyEncoding: { type: "pkcs8", format: "pem" },
      },
      (err, publicKey, privateKey) => {
        if (err) reject(err);
        else resolve({ publicKey, privateKey });
      }
    );
  });
}

async function register() {
  console.log("1. Registering device...");
  keyPair = await generateKeys();

  const res = await fetch(`${API_URL}/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deviceId,
      publicKey: keyPair.publicKey,
    }),
  });

  const data = await res.json();
  console.log("Registration result:", data);
  return res.ok;
}

async function authenticate() {
  console.log("2. Authenticating...");
  const timestamp = Date.now().toString();
  const nonce = crypto.randomBytes(16).toString("hex");

  // Sign: nonce|deviceId|timestamp
  const payload = `${nonce}|${deviceId}|${timestamp}`;
  const sign = crypto.createSign("SHA256");
  sign.update(payload);
  sign.end();
  const signature = sign.sign(keyPair.privateKey, "base64");

  const res = await fetch(`${API_URL}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deviceId,
      timestamp,
      nonce,
      signature,
    }),
  });

  const data = await res.json();
  console.log("Auth result:", data);
  return res.ok;
}

async function connectSocket() {
  console.log("3. Connecting Socket...");
  return new Promise((resolve) => {
    const socket = io(SOCKET_URL);

    socket.on("connect", () => {
      console.log("Socket connected:", socket.id);
      socket.emit("join_dashboard");
    });

    socket.on("devices:update", (data) => {
      console.log("Received device update:", data);
      if (data.deviceId === deviceId) {
        console.log("SUCCESS: Received own update!");
        socket.disconnect();
        resolve(true);
      }
    });

    // Trigger a heartbeat to force an update
    setTimeout(async () => {
      console.log("Sending heartbeat...");
      await fetch(`${API_URL}/heartbeat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          payload: { temp: 25 },
        }),
      });
    }, 1000);
  });
}

async function run() {
  try {
    if (!(await register())) process.exit(1);
    if (!(await authenticate())) process.exit(1);
    await connectSocket();
    console.log("Verification Complete!");
  } catch (error) {
    console.error("Verification Failed:", error);
  }
}

run();
