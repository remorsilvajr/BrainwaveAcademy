import Link from "next/link";
import { GraduationCap, LogIn, UserPlus, KeyRound, ShieldCheck } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col justify-between font-sans">
      {/* Navigation Header */}
      <header className="max-w-6xl mx-auto w-full px-6 py-6 flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-xs">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">
            Brainwave Academy Admin Page
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-sky-600 transition-colors"
          >
            Log In
          </Link>
          <Link
            href="/register"
            className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors"
          >
            Create User Accounts
          </Link>
        </div>
      </header>

      {/* Main Hero */}
      <main className="max-w-4xl mx-auto px-6 py-16 text-center flex flex-col items-center justify-center gap-8 my-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold">
          <ShieldCheck className="h-4 w-4 text-sky-600" />
          Preschool Management Portal — Auth Gateway
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-3xl">
          Welcome to <span className="text-sky-600">Brainwave Academy</span>
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl">
          Clean preschool portal authentication suite with standard Next.js App Router route groups and shared layout.
        </p>

        {/* Quick Route Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full pt-4">
          <Link
            href="/login"
            className="group p-6 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-sky-500 transition-all text-left flex flex-col justify-between space-y-4"
          >
            <div className="h-10 w-10 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-colors">
              <LogIn className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base group-hover:text-sky-600 transition-colors">
                Log In
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Access your account (`/login`)
              </p>
            </div>
          </Link>

          <Link
            href="/users"
            className="group p-6 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-sky-500 transition-all text-left flex flex-col justify-between space-y-4"
          >
            <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base group-hover:text-emerald-600 transition-colors">
                Create Account
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Register a new user account (`/users`)
              </p>
            </div>
          </Link>

          <Link
            href="/reset-password"
            className="group p-6 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-sky-500 transition-all text-left flex flex-col justify-between space-y-4"
          >
            <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base group-hover:text-amber-600 transition-colors">
                Reset Password
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Request password reset link (`/reset-password`)
              </p>
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-500 border-t border-slate-200">
        &copy; {new Date().getFullYear()} Brainwave Academy. Preschool Management System.
      </footer>
    </div>
  );
}
