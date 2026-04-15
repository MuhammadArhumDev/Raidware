"use client";
import { useEffect } from 'react';
import useAuthStore from '@/store/useAuthStore';

export default function AuthHydrationProvider() {
  useEffect(() => {
    const hydrate = async () => {
      try {
        await useAuthStore.persist.rehydrate();
      } catch (e) {
        console.error('[Hydration] rehydrate failed:', e);
      } finally {
        // Always force-clear loading after rehydration attempt
        // regardless of success or failure
        useAuthStore.setState({
          _hasHydrated: true,
          isInitialized: true,
          isLoading: false,
        });
      }
    };
    hydrate();
  }, []);

  return null;
}
