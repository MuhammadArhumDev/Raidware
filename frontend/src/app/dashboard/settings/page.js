"use client";

import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import useAuthStore from "@/store/useAuthStore";
import { User, Bell, Shield, Database, Lock } from "lucide-react";

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your account and system preferences
          </p>
        </div>

        {/* Account Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Account Information
            </h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role
              </label>
              <input
                type="text"
                value={
                  user?.email?.includes("admin") ? "Administrator" : "Operator"
                }
                disabled
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
              />
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Notifications
            </h2>
          </div>
          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Email Notifications
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Receive alerts via email
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 text-indigo-600 rounded"
              />
            </label>
            <label className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Push Notifications
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Receive browser push notifications
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="w-5 h-5 text-indigo-600 rounded"
              />
            </label>
            <label className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">
                  Critical Alerts Only
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Only notify for critical severity alerts
                </p>
              </div>
              <input
                type="checkbox"
                className="w-5 h-5 text-indigo-600 rounded"
              />
            </label>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Security
            </h2>
          </div>
          <div className="space-y-4">
            <button className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors">
              Change Password
            </button>
            <button className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors">
              Enable Two-Factor Authentication
            </button>
          </div>
        </div>

        {/* Organization Global Keys */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Organization Device Keys
            </h2>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Set a global shared secret for authenticating new devices not yet
            individually registered.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const secret = e.target.secret.value;
              if (!secret) return;
              try {
                const res = await fetch(
                  `${
                    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
                  }/api/admin/settings/keys`,
                  {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      // Add auth token header if needed
                    },
                    body: JSON.stringify({ sharedSecret: secret }),
                  }
                );
                if (res.ok) alert("Global Key Updated!");
                else alert("Update Failed");
              } catch (err) {
                alert("Error updating key");
              }
            }}
          >
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Global Shared Secret (HMAC Key)
              </label>
              <input
                name="secret"
                type="password"
                placeholder="Enter robust shared key..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg"
              >
                Update Global Key
              </button>
            </div>
          </form>
        </div>

        {/* System Information */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              System Information
            </h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                Data Source
              </span>
              <span className="text-gray-900 dark:text-white font-medium">
                Mock Data
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                API Version
              </span>
              <span className="text-gray-900 dark:text-white font-medium">
                v1.0.0
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">
                Last Sync
              </span>
              <span className="text-gray-900 dark:text-white font-medium">
                Just now
              </span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
