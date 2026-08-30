import Link from 'next/link'

const navigationItems = [
  { label: 'About Us', href: '#about-us' },
  { label: 'Programs', href: '#programs' },
  { label: '6 Domains', href: '#domains' },
]

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-[#c6c5d2] bg-[#fbf8ff] shadow-[0px_1px_2px_#0000000d]">
      <nav
        className="mx-auto grid w-full max-w-screen-xl grid-cols-[auto_1fr_auto] items-center gap-4 px-6 py-4"
        aria-label="Primary navigation"
      >
        <Link href="/" className="block h-10 w-auto shrink-0" aria-label="Home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="h-10 w-auto"
            alt="Brainwave Preschool Academy"
            src="/images/landing/logo.svg"
          />
        </Link>

        <ul className="flex flex-wrap items-center justify-center gap-6 md:gap-8 list-none m-0 p-0">
          {navigationItems.map((item) => (
            <li key={item.label}>
              <a
                href={item.href}
                className="text-sm font-semibold tracking-[0.14px] text-[#454650] hover:text-[#0b1b62] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b1b62]"
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2 justify-self-end">
          <a
            href="/enroll"
            className="rounded-full bg-[#e6007e] px-6 py-2 text-sm font-semibold text-white shadow-[0px_1px_2px_#0000000d] hover:bg-[#c9006e] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0b1b62]"
          >
            Enroll
          </a>
          <a
            href="/login"
            className="rounded-full bg-[#0b1b62] px-6 py-2 text-sm font-semibold text-white shadow-[0px_1px_2px_#0000000d] hover:bg-[#08154d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#e6007e]"
          >
            Log In
          </a>
        </div>
      </nav>
    </header>
  )
}
