'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { mockDataService, reinitializeMockData } from '@/services/mockData';

const DataContext = createContext({});

export const useData = () => useContext(DataContext);

export const DataProvider = ({ children }) => {
  const [nodes, setNodes] = useState({});
  const [containers, setContainers] = useState({});
  const [sensors, setSensors] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only initialize on client to avoid hydration issues
    if (typeof window === 'undefined') return;
    
    setMounted(true);
    
    // Re-initialize mock data on client with current timestamps
    reinitializeMockData();

    // Start mock data updates
    mockDataService.startUpdates();

    // Subscribe to data updates
    const unsubscribeNodes = mockDataService.subscribe('nodes', (data) => {
      setNodes(data);
    });

    const unsubscribeContainers = mockDataService.subscribe('containers', (data) => {
      setContainers(data);
    });

    const unsubscribeSensors = mockDataService.subscribe('sensors', (data) => {
      setSensors(data);
    });

    const unsubscribeAlerts = mockDataService.subscribe('alerts', (data) => {
      setAlerts(data);
    });

    setLoading(false);

    // Cleanup
    return () => {
      unsubscribeNodes();
      unsubscribeContainers();
      unsubscribeSensors();
      unsubscribeAlerts();
      mockDataService.stopUpdates();
    };
  }, []);

  const dismissAlert = (alertId) => {
    mockDataService.dismissAlert(alertId);
  };

  const value = {
    nodes,
    containers,
    sensors,
    alerts,
    loading,
    dismissAlert,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

