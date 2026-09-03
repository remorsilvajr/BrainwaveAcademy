import type { MetadataRoute } from 'next'
import { getSiteUrl } from '@/lib/site-url'

// Auth (middleware.ts) + RLS are the real security boundary for
// /admin,/teacher,/parent — a disallow rule here can't enforce anything on
// its own. This just keeps search engines from crawling and indexing pages
// that are login-gated anyway, as one more layer against a login/portal
// page turning up in search results or a crawler's cache.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/admin', '/teacher', '/parent'],
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`,
  }
}
