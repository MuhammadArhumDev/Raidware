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
            <h1 className="text-3xl font-bold text-gray-900  mb-2">
              CCTV Live Streams
            </h1>
            <p className="text-gray-600 ">
              Real-time monitoring of all CCTV cameras
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-none transition-colors ${
                viewMode === 'grid'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100  text-gray-600  hover:bg-gray-200 '
              }`}
            >
              <Grid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-none transition-colors ${
                viewMode === 'list'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100  text-gray-600  hover:bg-gray-200 '
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
                className="bg-white  rounded-none shadow-sm p-4 border-[1.5px] border-gray-200 "
              >
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 ">
                      {camera.name}
                    </h3>
                    <span className="px-2 py-1 bg-green-100  text-green-800  rounded-none text-xs font-medium">
                      {camera.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 ">
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
                className="bg-white  rounded-none shadow-sm p-6 border-[1.5px] border-gray-200 "
              >
                <div className="flex items-center gap-4 mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Video className="w-5 h-5 text-indigo-600 " />
                      <h3 className="text-lg font-semibold text-gray-900 ">
                        {camera.name}
                      </h3>
                      <span className="px-2 py-1 bg-green-100  text-green-800  rounded-none text-xs font-medium">
                        {camera.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 ">
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
        <div className="bg-white  rounded-none shadow-sm p-6 border-[1.5px] border-gray-200 ">
          <h2 className="text-xl font-semibold text-gray-900  mb-4">
            Camera Status
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-green-50  rounded-none">
              <p className="text-2xl font-bold text-green-600 ">
                {cameras.filter(c => c.status === 'online').length}
              </p>
              <p className="text-sm text-gray-600 ">Online</p>
            </div>
            <div className="text-center p-4 bg-red-50  rounded-none">
              <p className="text-2xl font-bold text-red-600 ">
                {cameras.filter(c => c.status === 'offline').length}
              </p>
              <p className="text-sm text-gray-600 ">Offline</p>
            </div>
            <div className="text-center p-4 bg-blue-50  rounded-none">
              <p className="text-2xl font-bold text-black ">
                {cameras.length}
              </p>
              <p className="text-sm text-gray-600 ">Total Cameras</p>
            </div>
            <div className="text-center p-4 bg-indigo-50  rounded-none">
              <p className="text-2xl font-bold text-indigo-600 ">
                24/7
              </p>
              <p className="text-sm text-gray-600 ">Recording</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}



