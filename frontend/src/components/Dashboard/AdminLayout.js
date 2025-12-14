"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import AdminSidebar from "./AdminSidebar";
import { Loader2 } from "lucide-react";
import useAuthStore from "@/store/useAuthStore";

export default function AdminLayout({ children }) {
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const _hasHydrated = useAuthStore((state) => state._hasHydrated);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const router = useRouter();

  // Derive loading and userRole
  const loading = !_hasHydrated || !isInitialized || isLoading;
  const userRole = user?.role || null;

  // Run checkAuth on mount if hydrated
  useEffect(() => {
    if (_hasHydrated && !isInitialized && !isLoading) {
      checkAuth();
    }
  }, [_hasHydrated, isInitialized, isLoading, checkAuth]);

  // Handle redirects
  useEffect(() => {
    if (!loading && !user) {
      router.push("/");
    } else if (!loading && user && userRole !== "admin") {
      router.push("/dashboard");
    }
  }, [user, loading, userRole, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!user || userRole !== "admin") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <AdminSidebar />
      <main className="lg:ml-64 min-h-screen p-4 lg:p-8">{children}</main>
    </div>
  );
}
