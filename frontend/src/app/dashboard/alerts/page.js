'use client';

import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import IDSAlerts from '@/components/Dashboard/IDSAlerts';

export default function AlertsPage() {
  return (
    <DashboardLayout>
      <IDSAlerts />
    </DashboardLayout>
  );
}

