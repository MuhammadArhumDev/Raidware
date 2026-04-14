'use client';

import useAuthStore from '@/store/useAuthStore';
import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import ProvisioningFlow from '@/components/DeviceSetup/ProvisioningFlow';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DeviceSetupPage() {
  const user = useAuthStore(state => state.user);
  const isInitialized = useAuthStore(state => state.isInitialized);
  const router = useRouter();
  const [orgId, setOrgId] = useState(null);

  useEffect(() => {
    if (!isInitialized) return;
    if (!user) {
      router.push('/login');
      return;
    }
    // Handle async setup page loading logic to find correct org
    const setupOrgId = async () => {
      try {
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";
        const token = useAuthStore.getState().token;
        const res = await fetch(`${backendUrl}/api/auth/me`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (res.ok && data?.data?.user?.organizationId) {
          setOrgId(data.data.user.organizationId);
        } else if (user.organizationId) {
          setOrgId(user.organizationId);
        }
      } catch (err) {
        if (user.organizationId) setOrgId(user.organizationId);
      }
    };
    setupOrgId();
  }, [isInitialized, user, router]);

  if (!orgId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-slate-600">Loading...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto py-8 px-4">
        <ProvisioningFlow orgId={orgId} />
      </div>
    </DashboardLayout>
  );
}
