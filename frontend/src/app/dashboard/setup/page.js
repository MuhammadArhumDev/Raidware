'use client';

import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import { useState } from 'react';
import { Network, Shield, Key, Wifi, Save, Loader2, CheckCircle } from 'lucide-react';

export default function SetupPage() {
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [networkConfig, setNetworkConfig] = useState({
    networkName: '',
    encryptionType: 'AES-256',
    mutualAuth: true,
    cctvEnabled: true,
    sensorTypes: ['temperature', 'humidity', 'pressure', 'motion'],
  });

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

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900  mb-2">
            Network Setup
          </h1>
          <p className="text-gray-600 ">
            Configure your IoT network with mutual authentication and strong encryption
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Network Configuration */}
          <div className="bg-white  rounded-none shadow-sm p-6 border-[1.5px] border-gray-200 ">
            <div className="flex items-center gap-3 mb-6">
              <Network className="w-6 h-6 text-indigo-600 " />
              <h2 className="text-xl font-semibold text-gray-900 ">
                Network Configuration
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700  mb-2">
                  Network Name
                </label>
                <input
                  type="text"
                  value={networkConfig.networkName}
                  onChange={(e) => setNetworkConfig({ ...networkConfig, networkName: e.target.value })}
                  required
                  className="w-full px-4 py-2 border-[1.5px] border-gray-300  rounded-none bg-white  text-gray-900 "
                  placeholder="My IoT Network"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700  mb-2">
                  Encryption Type
                </label>
                <select
                  value={networkConfig.encryptionType}
                  onChange={(e) => setNetworkConfig({ ...networkConfig, encryptionType: e.target.value })}
                  className="w-full px-4 py-2 border-[1.5px] border-gray-300  rounded-none bg-white  text-gray-900 "
                >
                  <option value="AES-256">AES-256 (Recommended)</option>
                  <option value="AES-128">AES-128</option>
                  <option value="ChaCha20-Poly1305">ChaCha20-Poly1305</option>
                  <option value="ASCON">ASCON (Post-Quantum)</option>
                </select>
                <p className="text-xs text-gray-500  mt-1">
                  Strong encryption for all network communications
                </p>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white  rounded-none shadow-sm p-6 border-[1.5px] border-gray-200 ">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="w-6 h-6 text-indigo-600 " />
              <h2 className="text-xl font-semibold text-gray-900 ">
                Security Settings
              </h2>
            </div>

            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 border-[1.5px] border-gray-200  rounded-none cursor-pointer hover:bg-gray-50 ">
                <div>
                  <p className="font-medium text-gray-900 ">Mutual Authentication</p>
                  <p className="text-sm text-gray-600 ">
                    Enable two-way authentication between devices and gateway
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={networkConfig.mutualAuth}
                  onChange={(e) => setNetworkConfig({ ...networkConfig, mutualAuth: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 rounded-none"
                />
              </label>

              <label className="flex items-center justify-between p-4 border-[1.5px] border-gray-200  rounded-none cursor-pointer hover:bg-gray-50 ">
                <div>
                  <p className="font-medium text-gray-900 ">Intrusion Detection System (IDS)</p>
                  <p className="text-sm text-gray-600 ">
                    Monitor network for attacks and unauthorized access
                  </p>
                </div>
                <input
                  type="checkbox"
                  defaultChecked
                  className="w-5 h-5 text-indigo-600 rounded-none"
                />
              </label>

              <label className="flex items-center justify-between p-4 border-[1.5px] border-gray-200  rounded-none cursor-pointer hover:bg-gray-50 ">
                <div>
                  <p className="font-medium text-gray-900 ">MAC Address Whitelisting</p>
                  <p className="text-sm text-gray-600 ">
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
          <div className="bg-white  rounded-none shadow-sm p-6 border-[1.5px] border-gray-200 ">
            <div className="flex items-center gap-3 mb-6">
              <Wifi className="w-6 h-6 text-indigo-600 " />
              <h2 className="text-xl font-semibold text-gray-900 ">
                Device Types
              </h2>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-4 border-[1.5px] border-gray-200  rounded-none cursor-pointer hover:bg-gray-50 ">
                <div>
                  <p className="font-medium text-gray-900 ">CCTV Cameras</p>
                  <p className="text-sm text-gray-600 ">
                    Enable CCTV camera integration with AI analytics
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={networkConfig.cctvEnabled}
                  onChange={(e) => setNetworkConfig({ ...networkConfig, cctvEnabled: e.target.checked })}
                  className="w-5 h-5 text-indigo-600 rounded-none"
                />
              </label>

              <div className="p-4 border-[1.5px] border-gray-200  rounded-none">
                <p className="font-medium text-gray-900  mb-3">Sensor Types</p>
                <div className="grid grid-cols-2 gap-3">
                  {['temperature', 'humidity', 'pressure', 'motion', 'light', 'sound'].map((type) => (
                    <label key={type} className="flex items-center gap-2 cursor-pointer">
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
                              sensorTypes: networkConfig.sensorTypes.filter(t => t !== type),
                            });
                          }
                        }}
                        className="w-4 h-4 text-indigo-600 rounded-none"
                      />
                      <span className="text-sm text-gray-700  capitalize">{type}</span>
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
              className="px-6 py-3 bg-black text-white hover:bg-gray-800 border border-transparent text-white font-semibold rounded-none transition-colors duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
      </div>
    </DashboardLayout>
  );
}
