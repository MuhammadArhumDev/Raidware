/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  // Turbopack configuration (Next.js 16 default)
  turbopack: {},
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: "http://5.189.167.55:9631/api/:path*",
      },
    ];
  },
  // Webpack fallback for compatibility
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias.canvas = false;
    }
    return config;
  },
};

export default nextConfig;
