import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker Desktop on Mac/Windows: reliable file watching
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      };
    }
    return config;
  },
};

export default nextConfig;
