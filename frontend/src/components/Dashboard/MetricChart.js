'use client';

import { useMemo } from 'react';
import RealTimeChart from './RealTimeChart';
import { format } from 'date-fns';

function getColor(colorName, alpha = 1) {
  const colors = {
    indigo: `rgba(99, 102, 241, ${alpha})`,
    red: `rgba(239, 68, 68, ${alpha})`,
    green: `rgba(34, 197, 94, ${alpha})`,
    yellow: `rgba(251, 191, 36, ${alpha})`,
    blue: `rgba(59, 130, 246, ${alpha})`,
    purple: `rgba(168, 85, 247, ${alpha})`,
    orange: `rgba(249, 115, 22, ${alpha})`,
  };
  return colors[colorName] || colors.indigo;
}

export default function MetricChart({ 
  title, 
  dataSource, 
  dataKey, 
  color = 'indigo',
  type = 'line',
  height = 200,
  unit = '',
  gradient = false 
}) {
  const data = useMemo(() => {
    if (!dataSource || dataSource.length === 0) {
      return {
        labels: [],
        datasets: [{
          label: title,
          data: [],
          borderColor: getColor(color),
          backgroundColor: getColor(color, 0.1),
          tension: 0.4,
          fill: gradient,
        }],
      };
    }

    // Get last 20 data points
    const recentData = dataSource.slice(-20);
    const labels = recentData.map((item, index) => {
      const timestamp = item.timestamp || item[dataKey + '_timestamp'] || Date.now() - (20 - index) * 60000;
      return format(new Date(timestamp), 'HH:mm');
    });
    const values = recentData.map(item => item[dataKey] || 0);

    return {
      labels,
      datasets: [{
        label: title,
        data: values,
        borderColor: getColor(color),
        backgroundColor: gradient ? getColor(color, 0.2) : getColor(color, 0.1),
        tension: 0.4,
        fill: gradient || type === 'area',
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: getColor(color),
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        borderWidth: 2,
      }],
    };
  }, [dataSource, dataKey, title, color, gradient, type]);

  return (
    <RealTimeChart
      type={type}
      data={data}
      title={title}
      height={height}
      showLegend={false}
      gradient={gradient}
    />
  );
}

