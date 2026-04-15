'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import useAuthStore from '@/store/useAuthStore';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const _hasHydrated = useAuthStore((state) => state._hasHydrated);

  useEffect(() => {
    if (!_hasHydrated || !isInitialized) return; 

    if (isAuthenticated && user) {
      if (user.role === 'admin') {
        router.push('/admin/dashboard');
      } else {
        router.push('/dashboard');
      }
    } else {
      router.push('/login');
    }
  }, [_hasHydrated, isInitialized, isAuthenticated, user, router]);

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
    </main>
  );
}
