// Mock data service - Replace this with your actual API calls later

// Initialize with fixed base timestamp to avoid hydration issues
const getBaseTimestamp = () => {
  // Use a fixed timestamp that will be consistent between server and client
  // This will be updated on the client side after hydration
  if (typeof window !== 'undefined') {
    return Date.now();
  }
  // Server-side: use a fixed timestamp
  return 1704067200000; // Fixed timestamp for SSR consistency
};

// Mock nodes data - will be initialized on client
let mockNodes = {};
let mockContainers = {};
let mockSensorHistory = [];

// Initialize mock data (only on client to avoid hydration issues)
const initializeMockData = () => {
  const now = typeof window !== 'undefined' ? Date.now() : 1704067200000;
  
  mockNodes = {
    node1: { id: 'node1', status: 'online', lastSeen: now },
    node2: { id: 'node2', status: 'online', lastSeen: now - 5000 },
    node3: { id: 'node3', status: 'online', lastSeen: now - 10000 },
  };

  mockContainers = {
    container1: {
      id: 'container1',
      rfid: 'RFID123456',
      latitude: 40.7128,
      longitude: -74.0060,
      temperature: 22.5,
      humidity: 45.0,
      pressure: 1013.25,
      lastUpdate: now,
    },
    container2: {
      id: 'container2',
      rfid: 'RFID789012',
      latitude: 40.7130,
      longitude: -74.0062,
      temperature: 23.1,
      humidity: 47.0,
      pressure: 1013.30,
      lastUpdate: now,
    },
    container3: {
      id: 'container3',
      rfid: 'RFID345678',
      latitude: 40.7125,
      longitude: -74.0058,
      temperature: 21.8,
      humidity: 43.0,
      pressure: 1013.20,
      lastUpdate: now,
    },
  };

  // Generate sensor history
  const history = [];
  for (let i = 20; i >= 0; i--) {
    const timestamp = now - (i * 60000); // Every minute
    history.push({
      id: `sensor_${timestamp}`,
      temperature: 20 + Math.random() * 5,
      humidity: 40 + Math.random() * 10,
      pressure: 1013 + Math.random() * 5,
      timestamp,
    });
  }
  mockSensorHistory = history;
};

// Initialize on module load
// On server: use fixed timestamp
// On client: will use current timestamp
initializeMockData();

// Mock alerts data - will be initialized with proper timestamps
let mockAlerts = [];

const initializeAlerts = () => {
  const now = typeof window !== 'undefined' ? Date.now() : 1704067200000;
  mockAlerts = [
    {
      id: 'alert1',
      title: '🚨 IDS Alert: Suspicious ARP Spoofing Detected',
      message: 'Multiple ARP requests from unknown MAC address detected. Possible man-in-the-middle attack attempt.',
      severity: 'critical',
      source: 'ids',
      nodeId: 'gateway',
      attackType: 'ARP Spoofing',
      timestamp: now - 300000,
      dismissed: false,
    },
    {
      id: 'alert2',
      title: '🚨 IDS Alert: Deauthentication Attack',
      message: 'Multiple deauth frames detected. An attacker may be attempting to disconnect devices from the network.',
      severity: 'critical',
      source: 'ids',
      nodeId: 'node2',
      attackType: 'Deauth Attack',
      timestamp: now - 900000,
      dismissed: false,
    },
    {
      id: 'alert3',
      title: '🚨 IDS Alert: Rogue Access Point Detected',
      message: 'Unauthorized access point detected with SSID similar to your network. Potential evil twin attack.',
      severity: 'high',
      source: 'ids',
      nodeId: 'gateway',
      attackType: 'Rogue AP',
      timestamp: now - 1800000,
      dismissed: false,
    },
    {
      id: 'alert4',
      title: 'High Temperature Alert',
      message: 'Temperature exceeded 25°C threshold at Container 1',
      severity: 'high',
      source: 'sensor1',
      nodeId: 'node1',
      timestamp: now - 3600000,
      dismissed: false,
    },
    {
      id: 'alert5',
      title: 'Network Node Offline',
      message: 'Node 3 has been offline for more than 5 minutes',
      severity: 'medium',
      source: 'network',
      nodeId: 'node3',
      timestamp: now - 1800000,
      dismissed: false,
    },
  ];
};

// Initialize alerts
initializeAlerts();

// Export function to re-initialize on client
export const reinitializeMockData = () => {
  initializeMockData();
  initializeAlerts();
};

// Simulate real-time updates
class MockDataService {
  constructor() {
    this.subscribers = {
      nodes: new Set(),
      containers: new Set(),
      sensors: new Set(),
      alerts: new Set(),
    };
    this.updateInterval = null;
  }

  // Subscribe to data updates
  subscribe(type, callback) {
    this.subscribers[type].add(callback);
    // Immediately send current data
    this.notify(type);
    return () => this.subscribers[type].delete(callback);
  }

  // Notify all subscribers
  notify(type) {
    const data = this.getData(type);
    this.subscribers[type].forEach(callback => callback(data));
  }

  // Get current data
  getData(type) {
    switch (type) {
      case 'nodes':
        return mockNodes;
      case 'containers':
        return mockContainers;
      case 'sensors':
        return mockSensorHistory;
      case 'alerts':
        return mockAlerts.filter(a => !a.dismissed);
      default:
        return null;
    }
  }

  // Start simulating real-time updates
  startUpdates() {
    if (this.updateInterval) return;

    this.updateInterval = setInterval(() => {
      // Update sensor readings
      const newReading = {
        id: `sensor_${Date.now()}`,
        temperature: 20 + Math.random() * 5,
        humidity: 40 + Math.random() * 10,
        pressure: 1013 + Math.random() * 5,
        timestamp: Date.now(),
      };
      mockSensorHistory.push(newReading);
      // Keep only last 50 readings
      if (mockSensorHistory.length > 50) {
        mockSensorHistory.shift();
      }
      this.notify('sensors');

      // Update container data
      Object.keys(mockContainers).forEach(key => {
        mockContainers[key].temperature = 20 + Math.random() * 5;
        mockContainers[key].humidity = 40 + Math.random() * 10;
        mockContainers[key].pressure = 1013 + Math.random() * 5;
        mockContainers[key].lastUpdate = Date.now();
      });
      this.notify('containers');

      // Randomly update node status
      if (Math.random() > 0.9) {
        const nodeKeys = Object.keys(mockNodes);
        const randomNode = nodeKeys[Math.floor(Math.random() * nodeKeys.length)];
        mockNodes[randomNode].lastSeen = Date.now();
        this.notify('nodes');
      }
    }, 5000); // Update every 5 seconds
  }

  // Stop updates
  stopUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  // Dismiss alert
  dismissAlert(alertId) {
    const alert = mockAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.dismissed = true;
      alert.dismissedAt = Date.now();
      this.notify('alerts');
    }
  }
}

export const mockDataService = new MockDataService();

