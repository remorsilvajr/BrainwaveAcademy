import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Brainwave Preschool Academy',
  description: 'Nurturing Young Learners in Their Most Formative Years.',
}

// Explicitly opt into a light-only theme. Without this, some browsers'
// automatic dark-mode-for-websites feature will invert any unstyled area
// (like a plain <div> with no background class) to black when the user's
// OS is set to dark mode — which is what was happening on admin pages.
export const viewport: Viewport = {
  colorScheme: 'light',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-white text-gray-900`}>{children}</body>
    </html>
  )
}
