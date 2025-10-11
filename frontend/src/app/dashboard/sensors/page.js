'use client';

import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import SensorCharts from '@/components/Dashboard/SensorCharts';

export default function SensorsPage() {
  return (
    <DashboardLayout>
      <SensorCharts />
    </DashboardLayout>
  );
}



