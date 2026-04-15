"use client";
import { useEffect } from 'react';
import useAuthStore from '@/store/useAuthStore';

export default function AuthHydrationProvider() {
  useEffect(() => {
    // Manually trigger rehydration from localStorage (client only)
    // This is required because skipHydration: true is set
    const rehydrate = async () => {
      await useAuthStore.persist.rehydrate();
      // After rehydration, force the flags in case onRehydrateStorage
      // didn't fire correctly
      const state = useAuthStore.getState();
      if (!state._hasHydrated) {
        useAuthStore.setState({
          _hasHydrated: true,
          isInitialized: true,
          isLoading: false,
        });
      }
    };
    rehydrate();
  }, []);

  return null;
}
