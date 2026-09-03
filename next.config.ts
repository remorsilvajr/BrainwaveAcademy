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
  // Defense-in-depth response headers, applied site-wide. None of these are
  // the actual security boundary for user data — that's Supabase RLS plus
  // the auth checks in middleware.ts and each Server Action, all documented
  // in CLAUDE.md — but they close off unrelated browser-level attack
  // surface (clickjacking, MIME-sniffing, leaking full URLs to third-party
  // referrers) at effectively zero cost.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Superseded by CSP's frame-ancestors in newer guidance, but kept
          // for browsers that don't yet honor that — this app is never
          // meant to be iframed by anyone, including itself.
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // The app never uses the camera/microphone/geolocation APIs, so
          // deny them outright rather than leaving them open to whatever a
          // future compromised third-party script might try.
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // 2 years, matching MDN's own preload-eligible example — safe
          // since the whole site (including Vercel's own preview domains)
          // is HTTPS-only already.
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ]
  },
};

export default nextConfig;
