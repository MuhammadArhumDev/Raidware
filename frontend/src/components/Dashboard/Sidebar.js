"use client";

import { useRouter, usePathname } from "next/navigation";
import useAuthStore from "@/store/useAuthStore";
import {
  LayoutDashboard,
  Map,
  Activity,
  Bell,
  Settings,
  LogOut,
  Menu,
  X,
  Network,
  Video,
} from "lucide-react";
import { useState } from "react";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Map, label: "Network Topology", path: "/dashboard/map" },
  { icon: Activity, label: "Network Logs", path: "/dashboard/logs" },
  { icon: Bell, label: "IDS Alerts", path: "/dashboard/alerts" },
  { icon: Network, label: "Device Setup", path: "/dashboard/device-setup" },
  { icon: Settings, label: "Settings", path: "/dashboard/settings" },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const logout = useAuthStore((state) => state.logout);
  const user = useAuthStore((state) => state.user);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Debug log to trace what the sidebar sees
  console.log("[Sidebar Debug] Current user state from store:", user);

  const handleLogout = async () => {
    await logout();
    // Redirect is handled by the auth store, but we can have this as fallback
    router.push("/login");
  };

  const handleNavigation = (path) => {
    router.push(path);
    setMobileMenuOpen(false);
  };

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-none bg-black text-white shadow-lg cursor-pointer"
      >
        {mobileMenuOpen ? (
          <X className="w-6 h-6" />
        ) : (
          <Menu className="w-6 h-6" />
        )}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 bg-black border-r border-gray-800
          transform transition-transform duration-300 ease-in-out z-40
          ${
            mobileMenuOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-6 border-b border-gray-800">
            <h1 className="text-2xl font-bold text-white">
              Raidware
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Organization Portal
            </p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;

              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path)}
                  className={`
                    w-full flex items-center gap-3 px-4 py-3 rounded-none transition-colors cursor-pointer
                    ${
                      isActive
                        ? "bg-white text-black"
                        : "text-gray-200 border border-gray-700 hover:bg-gray-800 hover:text-white"
                    }
                  `}
                >
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* User info and logout */}
          <div className="p-4 border-t border-gray-800">
            <div className="mb-4 px-4 py-2">
              <p className="text-sm font-medium text-white truncate">
                {user?.email || "User"}
              </p>
              {user?.role === 'admin' ? (
                <p className="text-xs text-gray-500 mt-0.5">
                  Admin
                </p>
              ) : (
                <div className="mt-1">
                  <p className="text-xs text-gray-500">Organization ID</p>
                  <p className="text-xs text-gray-300 font-mono truncate mt-0.5">
                    {user?.organizationId
                      ? String(user.organizationId)
                      : "Not assigned"}
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-none text-red-400 hover:bg-gray-900 transition-colors cursor-pointer"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
