"use client";
import { useEffect } from "react";
import useAuthStore from "@/store/useAuthStore";

export default function AuthHydrationProvider() {
  useEffect(() => {
    const hydrate = async () => {
      try {

        await useAuthStore.persist.rehydrate();
      } catch (e) {
        console.error("[Hydration] rehydrate failed:", e);
      } finally {

        useAuthStore.setState({
          _hasHydrated: true,
          isInitialized: true,
          isLoading: false,
        });
      }

      const { token, user } = useAuthStore.getState();
      if (token && user) {
        await useAuthStore.getState().checkAuth();
      }
    };
    hydrate();
  }, []);

  return null;
}
