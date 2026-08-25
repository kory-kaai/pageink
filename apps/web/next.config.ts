import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@korykaai/pageink-core"],
  webpack: (config) => {
    config.resolve.alias.canvas = false;
    return config;
  },
};

export default nextConfig;
