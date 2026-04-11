import type { NextConfig } from "next";

const backendOrigin = process.env.NEXT_PUBLIC_BACKEND_ORIGIN || 'http://localhost:7126';
const backendUrl = new URL(backendOrigin);

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: backendUrl.protocol.replace(':', '') as 'http' | 'https',
        hostname: backendUrl.hostname,
        port: backendUrl.port,
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
