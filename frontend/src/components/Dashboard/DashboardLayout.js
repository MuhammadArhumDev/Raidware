"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Sidebar from "./Sidebar";
import { Loader2 } from "lucide-react";
import useAuthStore from "@/store/useAuthStore";

export default function DashboardLayout({ children }) {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const _hasHydrated = useAuthStore((state) => state._hasHydrated);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const router = useRouter();

  const loading = !_hasHydrated || !isInitialized || isLoading;
  const userRole = user?.role || null;

  useEffect(() => {
    if (_hasHydrated && !isInitialized && !isLoading) {
      checkAuth();
    }
  }, [_hasHydrated, isInitialized, isLoading, checkAuth]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    } else if (!loading && user && userRole === "admin") {
      router.push("/admin/dashboard");
    }
  }, [user, loading, userRole, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Sidebar />
      <main className="lg:ml-64 min-h-screen p-4 lg:p-8">{children}</main>
    </div>
  );
}
