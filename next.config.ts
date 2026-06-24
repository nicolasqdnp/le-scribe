import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['youtube-transcript', 'pdf-parse'],
  async redirects() {
    return [
      { source: '/campagne', destination: '/soutenir', permanent: true },
      { source: '/campagne/merci', destination: '/soutenir/merci', permanent: true },
    ]
  },
};

export default nextConfig;
