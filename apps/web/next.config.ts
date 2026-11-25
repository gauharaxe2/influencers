import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appDirectory = path.dirname(fileURLToPath(import.meta.url));

const apiInternalUrl = (
  process.env.API_INTERNAL_URL || "http://localhost:4000/api/v1"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(appDirectory, "../.."),
  transpilePackages: ["@creator-platform/contracts"],
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${apiInternalUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
