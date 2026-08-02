"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { GraduationCap, LogOut, ShieldCheck, User, Calendar, BookOpen, Bell } from "lucide-react";
import { isAuthenticated } from "@/lib/auth";

interface UserProfile {
  firstName: string;
  middleName?: string;
  lastName: string;
  email?: string;
  role?: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push("/login");
      return;
    }

    const storedUser = localStorage.getItem("authUser");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        setUser({ firstName: "Parent", lastName: "User" });
      }
    } else {
      setUser({ firstName: "Parent", lastName: "User" });
    }
    setLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    localStorage.removeItem("authUser");
    router.push("/login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-sm">
        Loading Parent Portal Dashboard...
      </div>
    );
  }

  const fullName = user
    ? `${user.firstName}${user.middleName ? ` ${user.middleName}` : ""} ${user.lastName}`
    : "Parent User";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between font-sans">
      {/* Dashboard Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-sky-600 flex items-center justify-center text-white shadow-xs">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xl font-bold text-slate-900 tracking-tight block">
                Brainwave Academy
              </span>
              <span className="text-xs font-medium text-slate-500 block">
                Preschool Parent Portal
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold">
              <ShieldCheck className="h-3.5 w-3.5 text-sky-600" />
              Parent Portal
            </span>

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Content */}
      <main className="max-w-6xl mx-auto w-full px-6 py-10 flex-1 space-y-8">
        {/* Welcome Hero Banner */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
              <User className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Welcome back, {fullName}!
              </h1>
              <p className="text-sm text-slate-500">
                Logged in as <strong className="font-semibold text-slate-700">{user?.email || "parent@brainwave.edu"}</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Dashboard Activity Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
            <div className="h-10 w-10 rounded-xl bg-sky-100 text-sky-600 flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Upcoming Events</h3>
            <p className="text-xs text-slate-500">
              Check preschool calendar, field trips, and parent-teacher meetings.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
            <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <BookOpen className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Student Progress</h3>
            <p className="text-xs text-slate-500">
              View daily activity logs, learning reports, and attendance records.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-3">
            <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <Bell className="h-5 w-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-lg">Announcements</h3>
            <p className="text-xs text-slate-500">
              Important school notices and messages from classroom teachers.
            </p>
          </div>
        </div>
      </main>

      {/* Dashboard Footer */}
      <footer className="py-6 text-center text-xs text-slate-500 border-t border-slate-200">
        &copy; {new Date().getFullYear()} Brainwave Academy. Preschool Parent Portal.
      </footer>
    </div>
  );
}
