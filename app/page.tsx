"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GraduationCap, LogIn, UserPlus, KeyRound, ShieldCheck, Sparkles, ArrowRight } from "lucide-react";
import { isAuthenticated, getStoredUser } from "@/lib/auth";

export default function Home() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [userName, setUserName] = useState("Parent");

  useEffect(() => {
    const authenticated = typeof window !== "undefined" && localStorage.getItem("isAuthenticated") === "true" && Boolean(localStorage.getItem("authUser"));
    setLoggedIn(authenticated);

    if (authenticated) {
      const storedUser = localStorage.getItem("authUser");
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          const firstName = user?.firstName?.trim() || "Parent";
          setUserName(firstName);
        } catch {
          setUserName("Parent");
        }
      }
    }
  }, []);

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col justify-between font-sans">
      <header className="max-w-6xl mx-auto w-full px-6 py-6 flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-xs">
            <GraduationCap className="h-6 w-6" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">
            Brainwave Academy
          </span>
        </div>
        <div className="flex items-center gap-3">
          {loggedIn ? (
            <Link href="/dashboard" className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors">
              Open Portal
            </Link>
          ) : (
            <>
              <Link href="/login" className="px-4 py-2 text-sm font-semibold text-slate-700 hover:text-sky-600 transition-colors">
                Log In
              </Link>
              <Link href="/register" className="px-4 py-2 text-sm font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors">
                Create Account
              </Link>
            </>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16 text-center flex flex-col items-center justify-center gap-8 my-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold">
          <ShieldCheck className="h-4 w-4 text-sky-600" />
          Preschool Parent Portal
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-3xl">
          {loggedIn ? `Welcome back, ${userName}!` : "Welcome to Brainwave Academy"}
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl">
          {loggedIn
            ? "Your family dashboard is ready. Review updates, announcements, and your child’s progress in one place."
            : "A simple, friendly preschool portal for parents to access updates, announcements, and daily learning moments."}
        </p>

        {loggedIn ? (
          <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-xs text-left space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">You’re signed in</h2>
                <p className="text-sm text-slate-500">Continue to your parent portal to see what’s new today.</p>
              </div>
            </div>
            <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 transition-colors">
              Go to dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full pt-4">
            <Link href="/login" className="group p-6 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-sky-500 transition-all text-left flex flex-col justify-between space-y-4">
              <div className="h-10 w-10 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition-colors">
                <LogIn className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base group-hover:text-sky-600 transition-colors">Log In</h3>
                <p className="text-xs text-slate-500 mt-1">Access your parent portal account</p>
              </div>
            </Link>

            <Link href="/register" className="group p-6 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-sky-500 transition-all text-left flex flex-col justify-between space-y-4">
              <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <UserPlus className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base group-hover:text-emerald-600 transition-colors">Create Account</h3>
                <p className="text-xs text-slate-500 mt-1">Register a new parent account</p>
              </div>
            </Link>

            <Link href="/reset-password" className="group p-6 rounded-xl bg-white border border-slate-200 shadow-xs hover:border-sky-500 transition-all text-left flex flex-col justify-between space-y-4">
              <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base group-hover:text-amber-600 transition-colors">Reset Password</h3>
                <p className="text-xs text-slate-500 mt-1">Request password reset link</p>
              </div>
            </Link>
          </div>
        )}
      </main>

      <footer className="py-6 text-center text-xs text-slate-500 border-t border-slate-200">
        &copy; {new Date().getFullYear()} Brainwave Academy. Preschool Management System.
      </footer>
    </div>
  );
}
