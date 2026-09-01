import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { CrossTabAuthSync } from '@/components/cross-tab-auth-sync'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Brainwave Preschool Academy',
  description: 'Nurturing Young Learners in Their Most Formative Years.',
}

// Both schemes are genuinely supported now that every surface has a real
// dark: treatment (see app/globals.css and ThemeToggle) — color-scheme
// itself is kept in sync via the plain CSS in globals.css (:root vs
// :root.dark), not here, since this value can't react to the class the
// inline script below sets after the fact.
export const viewport: Viewport = {
  colorScheme: 'light dark',
}

// Applies the right theme class to <html> before first paint, so there's
// no flash of the wrong theme while React hydrates. Runs as a plain inline
// script rather than a useEffect specifically because a useEffect only
// runs after the initial render — the flash it's meant to prevent would
// already have happened by then. Reads localStorage first (an explicit
// choice from ThemeToggle), falling back to the OS preference for a
// first-time visitor who's never toggled anything.
const themeInitScript = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    // suppressHydrationWarning is scoped to this element only (React
    // doesn't propagate it to children) — needed because the inline script
    // above sets the "dark" class outside of React's own render output, so
    // server and client HTML for <html> legitimately differ on purpose.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${inter.className} bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100`}>
        <CrossTabAuthSync />
        {children}
        <Analytics />
      </body>
    </html>
  )
}
