import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site-url'

// Only the genuinely public, unauthenticated pages — the portals
// (/admin,/teacher,/parent) are login-gated and intentionally excluded
// here and in robots.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl()

  return [
    { url: siteUrl, changeFrequency: 'monthly', priority: 1 },
    { url: `${siteUrl}/enroll`, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${siteUrl}/faq`, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${siteUrl}/login`, changeFrequency: 'yearly', priority: 0.5 },
    { url: `${siteUrl}/privacy-policy`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${siteUrl}/terms-of-service`, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
