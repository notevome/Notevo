import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  transpilePackages: ["@excalidraw/excalidraw"],
  webpack: (config) => {
    config.resolve.alias["@excalidraw/excalidraw/index.css"] = path.resolve(
      process.cwd(),
      "node_modules/@excalidraw/excalidraw/dist/prod/index.css",
    );

    return config;
  },
};

export default nextConfig;
