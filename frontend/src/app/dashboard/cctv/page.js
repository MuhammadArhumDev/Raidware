'use client';

import DashboardLayout from '@/components/Dashboard/DashboardLayout';
import CCTVStream from '@/components/Dashboard/CCTVStream';
import { Video, Grid, List } from 'lucide-react';
import { useState } from 'react';

export default function CCTVPage() {
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
  const [selectedCamera, setSelectedCamera] = useState(null);

  // Mock CCTV cameras
  const cameras = [
    {
      id: 'camera1',
      name: 'Main Entrance',
      location: 'Building A - Front',
      status: 'online',
      streamUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
    },
    {
      id: 'camera2',
      name: 'Warehouse Floor',
      location: 'Building A - Level 1',
      status: 'online',
      streamUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
    },
    {
      id: 'camera3',
      name: 'Loading Dock',
      location: 'Building A - Rear',
      status: 'online',
      streamUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
    },
    {
      id: 'camera4',
      name: 'Parking Lot',
      location: 'Exterior - North',
      status: 'online',
      streamUrl: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              CCTV Live Streams
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Real-time monitoring of all CCTV cameras
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Camera Grid */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cameras.map((camera) => (
              <div
                key={camera.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 border border-gray-200 dark:border-gray-700"
              >
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {camera.name}
                    </h3>
                    <span className="px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full text-xs font-medium">
                      {camera.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {camera.location}
                  </p>
                </div>
                <CCTVStream camera={camera} />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {cameras.map((camera) => (
              <div
                key={camera.id}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Video className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {camera.name}
                      </h3>
                      <span className="px-2 py-1 bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 rounded-full text-xs font-medium">
                        {camera.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {camera.location}
                    </p>
                  </div>
                </div>
                <CCTVStream camera={camera} />
              </div>
            ))}
          </div>
        )}

        {/* Camera Stats */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Camera Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {cameras.filter(c => c.status === 'online').length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Online</p>
            </div>
            <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                {cameras.filter(c => c.status === 'offline').length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Offline</p>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {cameras.length}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Cameras</p>
            </div>
            <div className="text-center p-4 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                24/7
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Recording</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}



