import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root explicitly — a stray lockfile in a parent
  // directory (outside this repo) otherwise makes Next.js misdetect it.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
