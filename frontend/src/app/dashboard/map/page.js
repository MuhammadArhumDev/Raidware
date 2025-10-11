'use client';

import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import NetworkTopology from '@/components/Dashboard/NetworkTopology';

export default function TopologyPage() {
  return (
    <DashboardLayout>
      <NetworkTopology />
    </DashboardLayout>
  );
}

