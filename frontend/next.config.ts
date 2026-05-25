import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["wagmi", "@wagmi/core", "viem"],
};

export default nextConfig;
