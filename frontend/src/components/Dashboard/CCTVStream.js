// 'use client';

// import { useState, useEffect } from 'react';
// import { Video, VideoOff, Maximize2, Play, Pause } from 'lucide-react';

// export default function CCTVStream({ camera, isFullscreen = false, onFullscreen }) {
//   const [isPlaying, setIsPlaying] = useState(true);
//   const [error, setError] = useState(false);

//   // Mock stream URL - Replace with actual RTSP/WebRTC stream URL
//   const streamUrl = camera?.streamUrl || `https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4`;

//   return (
//     <div className={`relative bg-black rounded-lg overflow-hidden ${isFullscreen ? 'w-full h-full' : 'w-full aspect-video'}`}>
//       {error ? (
//         <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
//           <div className="text-center">
//             <VideoOff className="w-12 h-12 text-gray-500 mx-auto mb-2" />
//             <p className="text-gray-400 text-sm">Stream unavailable</p>
//             <button
//               onClick={() => {
//                 setError(false);
//                 setIsPlaying(true);
//               }}
//               className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm rounded-lg"
//             >
//               Retry
//             </button>
//           </div>
//         </div>
//       ) : (
//         <>
//           <video
//             src={streamUrl}
//             autoPlay
//             muted
//             loop
//             playsInline
//             className="w-full h-full object-cover"
//             onError={() => setError(true)}
//           />
          
//           {/* Overlay Controls */}
//           <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity">
//             <div className="absolute bottom-0 left-0 right-0 p-4">
//               <div className="flex items-center justify-between">
//                 <div className="flex items-center gap-2">
//                   <button
//                     onClick={() => setIsPlaying(!isPlaying)}
//                     className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
//                   >
//                     {isPlaying ? (
//                       <Pause className="w-5 h-5" />
//                     ) : (
//                       <Play className="w-5 h-5" />
//                     )}
//                   </button>
//                   <span className="text-white text-sm font-medium">
//                     {camera?.name || 'Camera 1'}
//                   </span>
//                 </div>
//                 {onFullscreen && (
//                   <button
//                     onClick={onFullscreen}
//                     className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
//                   >
//                     <Maximize2 className="w-5 h-5" />
//                   </button>
//                 )}
//               </div>
//             </div>
//           </div>

//           {/* Status Indicator */}
//           <div className="absolute top-2 right-2 flex items-center gap-2">
//             <div className="flex items-center gap-1 px-2 py-1 bg-green-500/80 rounded text-white text-xs">
//               <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
//               LIVE
//             </div>
//           </div>
//         </>
//       )}
//     </div>
//   );
// }

