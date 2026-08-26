import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen flex flex-col bg-cover bg-center bg-no-repeat font-body"
      style={{ backgroundImage: "url('/assets/bg.png')" }}
    >
      {/* Shared Public Header */}
      <header className="w-full bg-white/80 backdrop-blur-md border-b border-slate-100 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link href="/" className="flex items-center">
            <img src="/assets/bwa_logo.png" alt="Brainwave Academy" className="h-12 w-auto object-contain" />
          </Link>

          <nav className="hidden md:flex items-center gap-8 font-medium text-slate-700 text-sm">
            <Link href="/#about" className="hover:text-brand-navy transition-colors">About Us</Link>
            <Link href="/#programs" className="hover:text-brand-navy transition-colors">Programs</Link>
            <Link href="/#domains" className="hover:text-brand-navy transition-colors">6 Domains</Link>
            <Link href="/#grading" className="hover:text-brand-navy transition-colors">Grading & Feedback</Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/enroll"
              className="px-6 py-2.5 rounded-full bg-brand-pink text-white font-semibold text-sm hover:bg-brand-pinkHover transition-all shadow-sm"
            >
              Enroll
            </Link>
            <Link
              href="/login"
              className="px-6 py-2.5 rounded-full bg-brand-navy text-white font-semibold text-sm hover:bg-navy-900 transition-all shadow-sm"
            >
              Log In
            </Link>
          </div>
        </div>
      </header>

      {/* Auth Viewport Content */}
      <main className="flex-1 flex items-center justify-center p-6">{children}</main>
    </div>
  );
}