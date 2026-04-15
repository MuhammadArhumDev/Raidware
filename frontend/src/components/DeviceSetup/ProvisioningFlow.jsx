'use client';

import { useState } from 'react';
import { Copy, Check, AlertCircle, ChevronRight } from 'lucide-react';

export default function ProvisioningFlow({ orgId }) {
  const [step, setStep] = useState(1); 
  const [macAddress, setMacAddress] = useState('');
  const [deviceName, setDeviceName] = useState('');
  const [provisioning, setProvisioning] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(null);

  const handleGenerateKeys = async () => {
    if (!macAddress) {
      setError('Please enter device MAC address');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
      const token = localStorage.getItem('auth-storage') ? JSON.parse(localStorage.getItem('auth-storage'))?.state?.token : null;

      const response = await fetch(`${backendUrl}/api/devices/device-provisioning/generate-keys/${orgId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({ macAddress, deviceName: deviceName || undefined })
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to generate keys');

      setProvisioning(data.provisioning);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg border border-slate-200">
      {}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900">Device Provisioning Setup</h2>
        <p className="text-slate-600 mt-2">
          Follow these steps to securely add a new IoT device to your organization
        </p>
      </div>

      {}
      <div className="flex justify-between mb-8">
        {[1, 2, 3, 4, 5].map((s) => (
          <div
            key={s}
            className={`flex items-center ${
              s <= step ? 'text-blue-600' : 'text-slate-400'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                s < step ? 'bg-green-500 text-white' : s === step ? 'bg-blue-600 text-white' : 'bg-slate-300'
              }`}
            >
              {s < step ? '✓' : s}
            </div>
            {s < 5 && <div className={`h-1 flex-1 mx-2 ${s < step ? 'bg-green-500' : 'bg-slate-300'}`} />}
          </div>
        ))}
      </div>

      {}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {}
      {step === 1 && (
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Step 1: Device Information</h3>
          <p className="text-slate-600 mb-4">
            Enter your IoT device's MAC address (found on device label or network settings). 
            Your device will connect <strong>directly to the server</strong> — no mesh parent required.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-900">
              <strong>ℹ️ Direct Connection:</strong> Your device will authenticate directly with our server 
              using HMAC-SHA256. It does not need to connect through a mesh parent node.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Device MAC Address *
              </label>
              <input
                type="text"
                placeholder="AA:BB:CC:DD:EE:FF"
                value={macAddress}
                onChange={(e) => setMacAddress(e.target.value.toUpperCase())}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-slate-500 mt-1">
                Format: HH:HH:HH:HH:HH:HH (found on device label or Settings → Network)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Device Name (optional)
              </label>
              <input
                type="text"
                placeholder="e.g., Sensor_Warehouse_1"
                value={deviceName}
                onChange={(e) => setDeviceName(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={handleGenerateKeys}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? 'Generating...' : 'Generate Keys & Secrets'}
              {!loading && <ChevronRight className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Copy Secrets */}
      {step >= 2 && provisioning && (
        <div className="bg-white rounded-lg p-6 border border-slate-200 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Step 2: Copy Provisioning Data</h3>
          <p className="text-slate-600 mb-4">
            Copy each value below and save them. You'll need these to configure your device.
          </p>

          <div className="space-y-4">
            {}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <p className="text-xs font-semibold text-slate-600 uppercase mb-2">Device ID</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-100 px-3 py-2 rounded font-mono text-sm text-slate-900 break-all">
                  {provisioning.deviceId}
                </code>
                <button
                  onClick={() => copyToClipboard(provisioning.deviceId, 'deviceId')}
                  className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  {copied === 'deviceId' ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5 text-slate-600" />
                  )}
                </button>
              </div>
            </div>

            {}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <p className="text-xs font-semibold text-slate-600 uppercase mb-2">Shared Secret (HMAC Key)</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-100 px-3 py-2 rounded font-mono text-sm text-slate-900 break-all">
                  {provisioning.sharedSecret}
                </code>
                <button
                  onClick={() => copyToClipboard(provisioning.sharedSecret, 'secret')}
                  className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  {copied === 'secret' ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5 text-slate-600" />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                ⚠️ Keep this secret. Device uses this to authenticate with server.
              </p>
            </div>

            {}
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <p className="text-xs font-semibold text-slate-600 uppercase mb-2">Server Public Key</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-slate-100 px-3 py-2 rounded font-mono text-xs text-slate-900 break-all max-h-20 overflow-y-auto">
                  {provisioning.serverPublicKey}
                </code>
                <button
                  onClick={() => copyToClipboard(provisioning.serverPublicKey, 'pubkey')}
                  className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  {copied === 'pubkey' ? (
                    <Check className="w-5 h-5 text-green-600" />
                  ) : (
                    <Copy className="w-5 h-5 text-slate-600" />
                  )}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                Device uses this to verify server responses.
              </p>
            </div>
          </div>

          <button
            onClick={() => setStep(3)}
            className="w-full mt-6 bg-slate-200 hover:bg-slate-300 text-slate-900 font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            I've Copied All Values
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STEP 3: Device Configuration Instructions */}
      {step >= 3 && (
        <div className="bg-white rounded-lg p-6 border border-slate-200 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Step 3: Flash Device Configuration</h3>
          <p className="text-slate-600 mb-4">
            Upload these values to your IoT device via the device's web interface or firmware flashing tool.
          </p>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-green-900 font-semibold">✅ Direct Connection Mode</p>
            <p className="text-sm text-green-800 mt-2">
              Your device will authenticate <strong>directly to our server</strong> using these credentials. 
              No mesh parent node setup required.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm font-semibold text-blue-900 mb-2">🔧 For ESP32/Arduino Devices:</p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-blue-800">
              <li>Connect to device via USB or WiFi web portal</li>
              <li>Open device web interface (usually http:
              <li>Go to Settings → Security → Device Credentials</li>
              <li>Paste the three values into the corresponding fields:
                <ul className="list-disc list-inside ml-4 mt-1 space-y-1">
                  <li><code className="bg-blue-100 px-1 rounded">DEVICE_ID</code> = {provisioning?.deviceId?.slice(0, 12)}...</li>
                  <li><code className="bg-blue-100 px-1 rounded">SHARED_SECRET</code> = {provisioning?.sharedSecret?.slice(0, 16)}...</li>
                  <li><code className="bg-blue-100 px-1 rounded">SERVER_PUBLIC_KEY</code> = {provisioning?.serverPublicKey?.slice(0, 20)}...</li>
                </ul>
              </li>
              <li>Click "Save & Reboot"</li>
              <li>Device will automatically authenticate and appear as "online" within 30 seconds</li>
            </ol>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-amber-900">⚠️ Important Notes:</p>
            <ul className="list-disc list-inside space-y-1 text-sm text-amber-800 mt-2">
              <li><strong>Network Requirements:</strong> Device must have internet access and be able to reach {provisioning?.serverUrl || 'our server'}</li>
              <li><strong>Firewall:</strong> Device needs outbound HTTPS (port 443) allowed</li>
              <li><strong>Copy Exactly:</strong> Double-check for extra spaces or typos — they will cause authentication to fail</li>
              <li><strong>No Mesh Parent Needed:</strong> Device authenticates directly without a coordinator</li>
              <li><strong>Dashboard Status:</strong> Check device list in your dashboard after reboot</li>
              <li><strong>Troubleshooting:</strong> Check device serial logs: if you see "✅ Authentication SUCCESS", device is working correctly</li>
            </ul>
          </div>

          <button
            onClick={() => setStep(4)}
            className="w-full mt-6 bg-slate-200 hover:bg-slate-300 text-slate-900 font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            Device Configured
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {}
      {step >= 4 && (
        <div className="bg-white rounded-lg p-6 border border-slate-200 mb-6">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Step 4: Verify Connection</h3>
          <p className="text-slate-600 mb-4">
            After device reboots, it will automatically authenticate using HMAC-SHA256 protocol.
          </p>

          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6 text-center">
            <div className="w-12 h-12 mx-auto bg-green-500 rounded-full flex items-center justify-center mb-4">
              <Check className="w-8 h-8 text-white" />
            </div>
            <p className="text-lg font-semibold text-green-900 mb-2">
              Device Status: Check Dashboard
            </p>
            <p className="text-sm text-green-800 mb-6">
              If all is well, you should see the device listed as "online" in your organization dashboard within 30 seconds.
            </p>
            <button
              onClick={() => window.location.href = '/dashboard'}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      )}

      {}
      {step >= 5 && (
        <div className="bg-white rounded-lg p-6 border border-slate-200">
          <h3 className="text-lg font-semibold text-slate-900 mb-4">Step 5: Complete</h3>
          <p className="text-slate-600">
            Your device is now provisioned and connected to the Raidware platform.
          </p>
        </div>
      )}
    </div>
  );
}
