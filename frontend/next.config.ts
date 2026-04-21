import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Railway advertises many CPUs; capping workers avoids OOM during prerender.
    cpus: 2,
  },
};

export default nextConfig;
