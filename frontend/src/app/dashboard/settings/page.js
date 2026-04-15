"use client";

import DashboardLayout from "@/components/Dashboard/DashboardLayout";
import useAuthStore from "@/store/useAuthStore";
import { User, Bell, Shield, Database, Lock } from "lucide-react";
import authFetch from "@/lib/authFetch";

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900  mb-2">
            Settings
          </h1>
          <p className="text-gray-600 ">
            Manage your account and system preferences
          </p>
        </div>

        {/* Account Settings */}
        <div className="bg-white  rounded-none shadow-sm p-6 border-[1.5px] border-gray-200 ">
          <div className="flex items-center gap-3 mb-6">
            <User className="w-6 h-6 text-indigo-600 " />
            <h2 className="text-xl font-semibold text-gray-900 ">
              Account Information
            </h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700  mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={user?.email || ""}
                disabled
                className="w-full px-4 py-2 border-[1.5px] border-gray-300  rounded-none bg-gray-50  text-gray-600 "
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700  mb-2">
                Role
              </label>
              <input
                type="text"
                value={
                  user?.email?.includes("admin") ? "Administrator" : "Operator"
                }
                disabled
                className="w-full px-4 py-2 border-[1.5px] border-gray-300  rounded-none bg-gray-50  text-gray-600 "
              />
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white  rounded-none shadow-sm p-6 border-[1.5px] border-gray-200 ">
          <div className="flex items-center gap-3 mb-6">
            <Bell className="w-6 h-6 text-indigo-600 " />
            <h2 className="text-xl font-semibold text-gray-900 ">
              Notifications
            </h2>
          </div>
          <div className="space-y-4">
            <label className="flex items-center justify-between p-4 border-[1.5px] border-gray-200  rounded-none cursor-pointer hover:bg-gray-50 ">
              <div>
                <p className="font-medium text-gray-900 ">
                  Email Notifications
                </p>
                <p className="text-sm text-gray-600 ">
                  Receive alerts via email
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
                <p className="font-medium text-gray-900 ">
                  Push Notifications
                </p>
                <p className="text-sm text-gray-600 ">
                  Receive browser push notifications
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
                <p className="font-medium text-gray-900 ">
                  Critical Alerts Only
                </p>
                <p className="text-sm text-gray-600 ">
                  Only notify for critical severity alerts
                </p>
              </div>
              <input
                type="checkbox"
                className="w-5 h-5 text-indigo-600 rounded-none"
              />
            </label>
          </div>
        </div>

        {/* Security Settings */}
        <div className="bg-white  rounded-none shadow-sm p-6 border-[1.5px] border-gray-200 ">
          <div className="flex items-center gap-3 mb-6">
            <Shield className="w-6 h-6 text-indigo-600 " />
            <h2 className="text-xl font-semibold text-gray-900 ">
              Security
            </h2>
          </div>
          <div className="space-y-4">
            <button className="w-full px-4 py-3 bg-black text-white hover:bg-gray-800 border border-transparent text-white font-medium rounded-none transition-colors">
              Change Password
            </button>
            <button className="w-full px-4 py-3 border-[1.5px] border-gray-300  hover:bg-gray-50  text-gray-700  font-medium rounded-none transition-colors">
              Enable Two-Factor Authentication
            </button>
          </div>
        </div>

        {/* Organization Global Keys */}
        <div className="bg-white  rounded-none shadow-sm p-6 border-[1.5px] border-gray-200 ">
          <div className="flex items-center gap-3 mb-6">
            <Lock className="w-6 h-6 text-indigo-600 " />
            <h2 className="text-xl font-semibold text-gray-900 ">
              Organization Device Keys
            </h2>
          </div>
          <p className="text-sm text-gray-600  mb-4">
            Set a global shared secret for authenticating new devices not yet
            individually registered.
          </p>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const secret = e.target.secret.value;
              if (!secret) return;
              try {
                const res = await authFetch(
                  "/api/admin/settings/keys",
                  {
                    method: "POST",
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
              <label className="block text-sm font-medium text-gray-700 ">
                Global Shared Secret (HMAC Key)
              </label>
              <input
                name="secret"
                type="password"
                placeholder="Enter robust shared key..."
                className="w-full px-4 py-2 border-[1.5px] border-gray-300  rounded-none bg-gray-50  text-gray-900 "
              />
              <button
                type="submit"
                className="px-4 py-2 bg-black text-white hover:bg-gray-800 border border-transparent text-white rounded-none"
              >
                Update Global Key
              </button>
            </div>
          </form>
        </div>

        {/* System Information */}
        <div className="bg-white  rounded-none shadow-sm p-6 border-[1.5px] border-gray-200 ">
          <div className="flex items-center gap-3 mb-6">
            <Database className="w-6 h-6 text-indigo-600 " />
            <h2 className="text-xl font-semibold text-gray-900 ">
              System Information
            </h2>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600 ">
                Data Source
              </span>
              <span className="text-gray-900  font-medium">
                Live API
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 ">
                API Version
              </span>
              <span className="text-gray-900  font-medium">
                v1.0.0
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 ">
                Last Sync
              </span>
              <span className="text-gray-900  font-medium">
                Just now
              </span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
