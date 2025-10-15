# Raidware - Cloud IoT Security Platform

A multi-tenant cloud platform that provides secure IoT network management services to organizations. Features include mutual authentication, strong encryption (AES-256, ASCON), Intrusion Detection System (IDS), CCTV integration with AI analytics, and comprehensive sensor monitoring. Organizations can sign up, configure their networks, and monitor security threats in real-time.

Built with Next.js and real-time data visualization. Currently uses mock data - easily integrate with your own backend!

## Features

- 🏢 **Multi-Tenant Platform** - Organizations can sign up and manage their own IoT networks
- 🔐 **Mutual Authentication** - Two-way authentication between devices and gateway
- 🔒 **Strong Encryption** - AES-256, ASCON (Post-Quantum), and other encryption options
- 🛡️ **Intrusion Detection System (IDS)** - Real-time monitoring of network attacks (Rogue AP, ARP Spoofing, Deauth attacks, etc.)

- 📊 **Sensor Monitoring** - Temperature, humidity, pressure, motion, and other sensor types
- 🗺️ **Network Map** - Interactive visualization of IoT devices and their locations
- 🚨 **IDS Alerts** - Real-time security alerts with attack type classification
- 📱 **Responsive Design** - Mobile-optimized UI using Tailwind CSS
- ⚡ **Real-time Updates** - Mock data service (easily replaceable with your backend)
- 🎨 **Modern UI** - Beautiful, dark-mode supported interface
- 🔌 **Backend Ready** - Clean API service layer for easy integration

## Tech Stack

- **Framework**: Next.js 16
- **Styling**: Tailwind CSS v4
- **Backend**: Mock data service (ready for your API integration)
- **Maps**: Leaflet.js & React-Leaflet
- **Charts**: Chart.js & React-Chartjs-2
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm or yarn package manager

### Installation

1. **Clone the repository** (if not already done)
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
```bash
npm run dev
   ```

4. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

5. **Login**
   - Use any email/password (mock authentication)
   - Example: `admin@warehouse.com` / `admin123`

The dashboard will work immediately with mock data! See `BACKEND_INTEGRATION.md` for integrating with your own backend.

## Current Setup

The dashboard currently uses **mock data** that simulates real-time updates. All data is generated locally and updates every 5 seconds.

### Mock Data Includes:
- 3 active nodes
- 3 containers with RFID tracking
- Real-time sensor readings (temperature, humidity, pressure)
- Sample alerts with different severity levels

### Integrating Your Backend

See `BACKEND_INTEGRATION.md` for detailed instructions on connecting to your own API. The integration is straightforward - just update the functions in `src/services/api.js`.

## Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── dashboard/          # Dashboard pages
│   │   │   ├── page.js         # Main dashboard
│   │   │   ├── map/            # Warehouse map page
│   │   │   ├── sensors/        # Sensor data page
│   │   │   ├── alerts/         # Alerts page
│   │   │   └── settings/       # Settings page
│   │   ├── layout.js           # Root layout with AuthProvider
│   │   └── page.js             # Login page
│   ├── components/
│   │   ├── Auth/
│   │   │   └── Login.js        # Login component
│   │   └── Dashboard/
│   │       ├── DashboardLayout.js
│   │       ├── Sidebar.js
│   │       ├── StatsCard.js
│   │       ├── WarehouseMap.js
│   │       ├── SensorCharts.js
│   │       └── AlertsPanel.js
│   ├── contexts/
│   │   └── AuthContext.js      # Authentication context
│   └── lib/
│       └── firebase.js         # Firebase configuration
├── public/                     # Static assets
├── .env.local                  # Environment variables (create this)
└── package.json
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Features Overview

### Dashboard Overview
- Real-time statistics (nodes, containers, alerts, network health)
- Quick action cards
- System status indicators

### Warehouse Map
- Interactive map showing container locations
- Real-time updates from Firebase
- Container details popup with sensor data
- Container list view

### Sensor Data
- Current readings display (temperature, humidity, pressure)
- Real-time line charts for trends
- Historical data visualization

### Alerts Panel
- Filter by severity (critical, high, medium, low)
- Real-time alert updates
- Dismiss functionality
- Alert details and timestamps

### Settings
- Account information
- Notification preferences
- Security settings
- System information

## Customization

### Update Warehouse Location

Edit `src/components/Dashboard/WarehouseMap.js`:
```javascript
const warehouseCenter = [YOUR_LATITUDE, YOUR_LONGITUDE];
```

### Modify Alert Severities

Edit `src/components/Dashboard/AlertsPanel.js` to customize severity levels and colors.

### Add New Dashboard Pages

1. Create a new page in `src/app/dashboard/your-page/page.js`
2. Add a menu item in `src/components/Dashboard/Sidebar.js`
3. Create corresponding components in `src/components/Dashboard/`

## Security Notes

- Never commit `.env.local` to version control
- Implement proper authentication checks in your backend
- Use HTTPS in production
- Validate all API inputs on the server side

## Troubleshooting

### Map not displaying
- Ensure Leaflet CSS is imported (already included)
- Check browser console for errors
- Verify Leaflet CDN is accessible

### Mock data not updating
- Check browser console for errors
- Verify DataContext is properly initialized
- Restart the dev server if needed

### Authentication not working
- Check that your API endpoints are correctly configured
- Verify CORS settings on your backend
- Check browser console for API errors

## Future Enhancements

- [ ] Push notifications (FCM)
- [ ] Advanced filtering and search
- [ ] Export data functionality
- [ ] User management interface
- [ ] Customizable dashboard widgets
- [ ] Historical data analysis
- [ ] Multi-warehouse support

## License

This project is part of a Final Year Project (FYP) for Raidware - Cyber-secured Mesh Network for IoT Devices implementation.

## Support

For issues or questions, please refer to the project documentation or contact the development team.
