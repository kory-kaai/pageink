import { createRequire } from "node:module";
import type { NextConfig } from "next";

const require = createRequire(import.meta.url);

const nextConfig: NextConfig = {
  transpilePackages: ["@korykaai/pageink-core"],
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
      // UMD build is self-contained (Buffer, pako) so custom fonts embed in the browser.
      "@pdf-lib/fontkit": require.resolve("@pdf-lib/fontkit/dist/fontkit.umd.js"),
    };
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
      stream: false,
    };
    return config;
  },
};

export default nextConfig;
