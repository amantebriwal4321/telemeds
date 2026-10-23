import type { NextConfig } from "next";

import { securityHeaders } from "./lib/csp";

const isDev = process.env.NODE_ENV !== "production";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  cacheComponents: true,
  partialPrefetching: true,
  serverExternalPackages: ["@huggingface/transformers", "onnxruntime-node", "onnxruntime-web", "sharp"],
  turbopack: {
    resolveAlias: {
      "onnxruntime-node": "./lib/empty.ts",
      sharp: "./lib/empty.ts",
    },
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders(isDev),
      },
    ];
  },
};

export default nextConfig;
