"use client";

import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import { useState, useEffect } from "react";
import useAuthStore from "@/store/useAuthStore";
import {
  Network,
  Shield,
  Wifi,
  Save,
  Loader2,
  CheckCircle,
  Copy,
  PlusCircle,
  AlertCircle,
  FileCode,
  Info,
} from "lucide-react";

export default function SetupPage() {
  const user = useAuthStore((state) => state.user);
  const token = useAuthStore((state) => state.token);

  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [networkConfig, setNetworkConfig] = useState({
    networkName: "",
    encryptionType: "AES-256",
    mutualAuth: true,
    sensorTypes: ["temperature", "humidity", "pressure", "motion"],
  });

  // Provisioning state
  const [deviceName, setDeviceName] = useState("");
  const [macAddress, setMacAddress] = useState("");
  const [provisionLoading, setProvisionLoading] = useState(false);
  const [provisionError, setProvisionError] = useState(null);
  const [secretsTemplate, setSecretsTemplate] = useState("");
  const [copiedId, setCopiedId] = useState(false);
  const [copiedSecrets, setCopiedSecrets] = useState(false);
  const [fetchedOrgId, setFetchedOrgId] = useState("");

  // Debug: Log auth store state on every render
  console.log("Debug [SetupPage] Render — user:", user);
  console.log("Debug [SetupPage] Render — token present:", !!token);
  console.log("Debug [SetupPage] Render — user.organizationId from store:", user?.organizationId);
  console.log("Debug [SetupPage] Render — NEXT_PUBLIC_BACKEND_URL env:", process.env.NEXT_PUBLIC_BACKEND_URL);

  useEffect(() => {
    const fetchOrgId = async () => {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
      const fullUrl = `${backendUrl}/api/auth/me`;
      console.log("Debug [fetchOrgId] Backend URL:", backendUrl);
      console.log("Debug [fetchOrgId] Full request URL:", fullUrl);
      console.log("Debug [fetchOrgId] Token (first 20 chars):", token?.substring(0, 20) + "...");

      try {
        const res = await fetch(fullUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        console.log("Debug [fetchOrgId] Response status:", res.status);
        const data = await res.json();
        console.log("Debug [fetchOrgId] Response body:", JSON.stringify(data, null, 2));

        if (res.ok && data?.data?.user?.organizationId) {
          console.log("Debug [fetchOrgId] SUCCESS — Organization ID:", data.data.user.organizationId);
          setFetchedOrgId(data.data.user.organizationId);
        } else {
          console.warn("Debug [fetchOrgId] FAILED — No organization ID in response. res.ok:", res.ok);
        }
      } catch (err) {
        console.error("Debug [fetchOrgId] NETWORK ERROR:", err.message);
        console.error("Debug [fetchOrgId] This usually means the backend URL is wrong or unreachable.");
      }
    };

    if (token) {
      console.log("Debug [SetupPage useEffect] Token exists, calling fetchOrgId...");
      fetchOrgId();
    } else {
      console.warn("Debug [SetupPage useEffect] No token available — skipping fetch");
    }
  }, [token]);

  // Use the fetched org ID or fallback to the user store
  const displayOrgId = fetchedOrgId || user?.organizationId || "";
  console.log("Debug [SetupPage] displayOrgId resolved to:", displayOrgId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);

    // TODO: Replace with actual API call
    setTimeout(() => {
      setLoading(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }, 1500);
  };

  const handleProvision = async (e) => {
    e.preventDefault();
    if (!macAddress) return;

    setProvisionLoading(true);
    setProvisionError(null);
    setSecretsTemplate("");

    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
      const res = await fetch(`${backendUrl}/api/devices/provision`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          macAddress,
          orgId: displayOrgId,
          deviceName,
        }),
      });

      console.log(res);

      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          throw new Error("This device is already provisioned");
        }
        throw new Error(data.error || "Failed to provision device");
      }

      setSecretsTemplate(data.data.secretsHTemplate);
      setMacAddress("");
      setDeviceName("");
    } catch (err) {
      setProvisionError(err.message);
    } finally {
      setProvisionLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Network Setup
          </h1>
          <p className="text-gray-600">
            Configure your IoT network with mutual authentication and strong
            encryption
          </p>
        </div>

        {/* Organization ID Card */}
        <div className="bg-indigo-50 border-[1.5px] border-indigo-100 rounded-none p-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-lg font-bold text-indigo-900 mb-1">
                Your Organization ID
              </h2>
              <p className="text-indigo-700 text-sm mb-3">
                Use this ID when provisioning devices manually.
              </p>
              <div className="flex items-center gap-2">
                <code className="bg-white px-3 py-1.5 rounded-md text-indigo-900 font-mono text-sm border border-indigo-200">
                  {displayOrgId || "Not assigned"}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(displayOrgId || "");
                    setCopiedId(true);
                    setTimeout(() => setCopiedId(false), 2000);
                  }}
                  className="p-1.5 text-indigo-600 hover:bg-indigo-100 rounded-md transition-colors"
                  title="Copy to clipboard"
                >
                  {copiedId ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <Copy className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
            <Shield className="w-8 h-8 text-indigo-300" />
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Network Configuration */}
          <div className="bg-white rounded-none shadow-sm p-6 border-[1.5px] border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <Network className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Network Configuration
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Network Name
                </label>
                <input
                  type="text"
                  value={networkConfig.networkName}
                  onChange={(e) =>
                    setNetworkConfig({
                      ...networkConfig,
                      networkName: e.target.value,
                    })
                  }
                  required
                  className="w-full px-4 py-2 border-[1.5px] border-gray-300 rounded-none bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  placeholder="My IoT Network"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Encryption Type
                </label>
                <select
                  value={networkConfig.encryptionType}
                  onChange={(e) =>
                    setNetworkConfig({
                      ...networkConfig,
                      encryptionType: e.target.value,
                    })
                  }
                  className="w-full px-4 py-2 border-[1.5px] border-gray-300 rounded-none bg-white text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="AES-256">AES-256 (Recommended)</option>
                  <option value="AES-128">AES-128</option>
                  <option value="ChaCha20-Poly1305">ChaCha20-Poly1305</option>
                  <option value="ASCON">ASCON (Post-Quantum)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  Strong encryption for all network communications
                </p>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-none shadow-sm p-6 border-[1.5px] border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Security Settings
              </h2>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 border-[1.5px] border-gray-200 rounded-none cursor-pointer hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">
                    Mutual Authentication
                  </p>
                  <p className="text-sm text-gray-600">
                    Enable two-way authentication between devices and gateway
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={networkConfig.mutualAuth}
                  onChange={(e) =>
                    setNetworkConfig({
                      ...networkConfig,
                      mutualAuth: e.target.checked,
                    })
                  }
                  className="w-5 h-5 text-indigo-600 rounded-none"
                />
              </label>

              <label className="flex items-center justify-between p-4 border-[1.5px] border-gray-200 rounded-none cursor-pointer hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">
                    Intrusion Detection System (IDS)
                  </p>
                  <p className="text-sm text-gray-600">
                    Monitor network for attacks and unauthorized access
                  </p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-5 h-5 text-indigo-600 rounded-none"
                />
              </label>

              <label className="flex items-center justify-between p-4 border-[1.5px] border-gray-200 rounded-none cursor-pointer hover:bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">
                    MAC Address Whitelisting
                  </p>
                  <p className="text-sm text-gray-600">
                    Only allow pre-approved devices to connect
                  </p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-5 h-5 text-indigo-600 rounded-none"
                />
              </label>
            </div>
          </div>

          {/* Device Types */}
          <div className="bg-white rounded-none shadow-sm p-6 border-[1.5px] border-gray-200">
            <div className="flex items-center gap-3 mb-6">
              <Wifi className="w-6 h-6 text-indigo-600" />
              <h2 className="text-xl font-semibold text-gray-900">
                Device Types
              </h2>
            </div>

            <div className="space-y-3">
              <div className="p-4 border-[1.5px] border-gray-200 rounded-none">
                <p className="font-medium text-gray-900 mb-3">Sensor Types</p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    "temperature",
                    "humidity",
                    "pressure",
                    "motion",
                    "light",
                    "sound",
                  ].map((type) => (
                    <label
                      key={type}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={networkConfig.sensorTypes.includes(type)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNetworkConfig({
                              ...networkConfig,
                              sensorTypes: [...networkConfig.sensorTypes, type],
                            });
                          } else {
                            setNetworkConfig({
                              ...networkConfig,
                              sensorTypes: networkConfig.sensorTypes.filter(
                                (t) => t !== type,
                              ),
                            });
                          }
                        }}
                        className="w-4 h-4 text-indigo-600 rounded-none"
                      />
                      <span className="text-sm text-gray-700 capitalize">
                        {type}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-black text-white hover:bg-gray-800 border border-transparent font-semibold rounded-none transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Save Configuration
                </>
              )}
            </button>
          </div>
        </form>

        {/* Device Provisioning Card */}
        <div className="bg-white rounded-none shadow-sm p-6 border-[1.5px] border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <PlusCircle className="w-6 h-6 text-indigo-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Device Provisioning
            </h2>
          </div>

          <form onSubmit={handleProvision} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Device Name (Optional)
                </label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="e.g. Sensor-01"
                  className="w-full px-4 py-2 border-[1.5px] border-gray-300 rounded-none bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  MAC Address (Required)
                </label>
                <input
                  type="text"
                  required
                  value={macAddress}
                  onChange={(e) => setMacAddress(e.target.value)}
                  placeholder="AA:BB:CC:DD:EE:FF"
                  className="w-full px-4 py-2 border-[1.5px] border-gray-300 rounded-none bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Organization ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={displayOrgId}
                  className="w-full px-4 py-2 border-[1.5px] border-gray-200 rounded-none bg-gray-50 text-gray-500 cursor-not-allowed"
                />
              </div>
            </div>

            {provisionError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-none flex items-center gap-2 text-sm">
                <AlertCircle className="w-4 h-4" />
                {provisionError}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={provisionLoading || !macAddress}
                className="px-6 py-2.5 bg-indigo-600 text-white hover:bg-indigo-700 font-semibold rounded-none transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {provisionLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Provisioning...
                  </>
                ) : (
                  <>
                    <FileCode className="w-5 h-5" />
                    Provision Device
                  </>
                )}
              </button>
            </div>
          </form>

          {secretsTemplate && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-bold text-gray-900">
                  Flash this into your firmware's Secrets.h file
                </label>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(secretsTemplate);
                    setCopiedSecrets(true);
                    setTimeout(() => setCopiedSecrets(false), 2000);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-sm font-medium transition-colors"
                >
                  {copiedSecrets ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                  {copiedSecrets ? "Copied!" : "Copy to Clipboard"}
                </button>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Replace the existing identity section in Secrets.h with the
                content below, then reflash your ESP32.
              </p>
              <div className="relative mb-6">
                <pre className="bg-gray-900 text-gray-100 p-4 rounded-md overflow-x-auto text-sm font-mono whitespace-pre-wrap break-all">
                  <code>{secretsTemplate}</code>
                </pre>
              </div>

              {/* Firmware Flash Guide */}
              <div className="bg-blue-50 border border-blue-200 rounded-md p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">
                    How to Flash Your Device
                  </h3>
                </div>
                <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800 ml-1">
                  <li>Open your firmware project in VS Code with PlatformIO</li>
                  <li>
                    Open the file:{" "}
                    <code className="bg-blue-100 px-1.5 py-0.5 rounded text-blue-900">
                      IOTs Firmware/include/Secrets.h
                    </code>
                  </li>
                  <li>
                    Find the identity section (
                    <code className="bg-blue-100 px-1.5 py-0.5 rounded text-blue-900">
                      DEVICE_SHARED_SECRET
                    </code>
                    ,{" "}
                    <code className="bg-blue-100 px-1.5 py-0.5 rounded text-blue-900">
                      DEVICE_MAC
                    </code>
                    ,{" "}
                    <code className="bg-blue-100 px-1.5 py-0.5 rounded text-blue-900">
                      DEVICE_ORG_ID
                    </code>
                    )
                  </li>
                  <li>Replace that section with the generated code above</li>
                  <li>Connect your ESP32 via USB</li>
                  <li>
                    Click <strong>Upload</strong> in PlatformIO (→ button) or
                    run:{" "}
                    <code className="bg-blue-100 px-1.5 py-0.5 rounded text-blue-900">
                      pio run --target upload
                    </code>
                  </li>
                  <li>
                    Open Serial Monitor (115200 baud) and watch for:{" "}
                    <code className="bg-blue-100 px-1.5 py-0.5 rounded text-blue-900 font-bold">
                      [Auth] SUCCESS
                    </code>
                  </li>
                  <li>
                    Return to the Network Topology page to see your device
                    appear
                  </li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
