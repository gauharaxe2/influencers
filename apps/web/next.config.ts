import type { NextConfig } from "next";

const apiInternalUrl = (
  process.env.API_INTERNAL_URL || "http://localhost:4000/api/v1"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
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
