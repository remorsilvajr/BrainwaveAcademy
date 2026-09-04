// Shared by SiteHeader (client component) and SiteFooter (server
// component). Deliberately its own plain module with no 'use client' —
// every export of a 'use client' module becomes a client-only reference
// when imported into a Server Component, not just its component export,
// so SiteFooter importing this straight from site-header.tsx crashed the
// whole page at render time ({imported module}.navigationItems.map is
// not a function). A plain data-only module has no such boundary and is
// safely importable from either side.
export const navigationItems = [
  { label: 'About Us', href: '/#about-us' },
  { label: 'Programs', href: '/#programs' },
  { label: '6 Domains', href: '/#domains' },
  { label: 'FAQs', href: '/faq' },
]
