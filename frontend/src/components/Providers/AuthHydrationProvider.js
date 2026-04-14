"use client";
import { useEffect } from "react";
import useAuthStore from "@/store/useAuthStore";

export default function AuthHydrationProvider() {
  useEffect(() => {
    const hydrate = async () => {
      try {
        // 1. Rehydrate from localStorage — restores user/token and re-sets the
        //    routing cookie (via onRehydrateStorage) so middleware sees the session.
        await useAuthStore.persist.rehydrate();
      } catch (e) {
        console.error("[Hydration] rehydrate failed:", e);
      } finally {
        // 2. Mark as hydrated regardless of outcome
        useAuthStore.setState({
          _hasHydrated: true,
          isInitialized: true,
          isLoading: false,
        });
      }

      // 3. Run checkAuth to validate the restored session and refresh the cookie.
      //    This is a lightweight local check (no network call) when user+token exist.
      const { token, user } = useAuthStore.getState();
      if (token && user) {
        await useAuthStore.getState().checkAuth();
      }
    };
    hydrate();
  }, []);

  return null;
}
