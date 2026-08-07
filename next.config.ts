import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // tldraw ships as ESM — must be transpiled by Next.js
  transpilePackages: ["tldraw", "@tldraw/tldraw"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "*.amazonaws.com" },
    ],
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["https://stellular-bubblegum-529a2f.netlify.app"],
    },
  },
};

export default nextConfig;
