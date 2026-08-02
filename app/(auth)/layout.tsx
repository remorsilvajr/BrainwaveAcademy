import React from "react";
import Link from "next/link";
import { GraduationCap } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col justify-between font-sans">
      {/* Educational Portal Top Navigation Header */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between border-b border-slate-200/80 bg-white sm:bg-transparent">
        <Link href="/" className="flex items-center gap-3 group focus:outline-none">
          <div className="h-10 w-10 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-xs group-hover:bg-sky-700 transition-colors">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-slate-900 block">
              Brainwave Academy
            </span>
            <span className="block text-xs font-medium text-slate-500">
              Preschool Management Portal
            </span>
          </div>
        </Link>
      </header>

      {/* Main Container - Centered Slate Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-auto">
        <div className="w-full max-w-md bg-white border border-slate-200 shadow-sm rounded-2xl p-6 sm:p-8">
          {children}
        </div>
      </main>

      {/* Clean Footer */}
      <footer className="py-6 text-center text-xs text-slate-500 border-t border-slate-200">
        &copy; {new Date().getFullYear()} Brainwave Academy. All rights reserved. Preschool Management System.
      </footer>
    </div>
  );
}
