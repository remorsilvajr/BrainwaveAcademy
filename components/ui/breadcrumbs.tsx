import Link from 'next/link'
import { getSiteUrl } from '@/lib/site-url'

type Crumb = { label: string; href?: string }

// Renders both the visible trail and its matching BreadcrumbList structured
// data in one place, so a page can't have one without the other going stale.
// The final crumb is the current page — rendered plain (no link, aria-current)
// per the breadcrumb a11y pattern, and still included in the JSON-LD list.
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const siteUrl = getSiteUrl()
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.href ? { item: `${siteUrl}${item.href}` } : {}),
    })),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex flex-wrap items-center gap-1.5 text-[#454650] dark:text-slate-400">
          {items.map((item, index) => {
            const isLast = index === items.length - 1
            return (
              <li key={item.label} className="flex items-center gap-1.5">
                {index > 0 && (
                  <span aria-hidden className="text-[#c6c5d2] dark:text-slate-600">
                    /
                  </span>
                )}
                {isLast || !item.href ? (
                  <span aria-current="page" className="font-medium text-[#0b1b62] dark:text-indigo-300">
                    {item.label}
                  </span>
                ) : (
                  <Link href={item.href} className="hover:text-[#0b1b62] hover:underline dark:hover:text-white">
                    {item.label}
                  </Link>
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </>
  )
}
