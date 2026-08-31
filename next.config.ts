import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    // Next's own default is just ['image/webp']. AVIF is listed first so a
    // browser that sends it in its Accept header (most current ones) gets
    // it — typically 20-30% smaller than WebP at the same visual quality —
    // with WebP as the fallback for anything that doesn't.
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
