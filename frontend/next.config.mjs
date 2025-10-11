/** @type {import('next').NextConfig} */
const nextConfig = {
  // Turbopack configuration (Next.js 16 default)
  turbopack: {},
  // Webpack fallback for compatibility
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.alias.canvas = false;
    }
    return config;
  },
};

export default nextConfig;
