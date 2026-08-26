// app/(auth)/login/page.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100/80 shadow-xl shadow-pink-500/5 p-8 sm:p-10">
      <div className="text-center mb-8">
        <h1 className="font-heading text-3xl font-bold text-brand-navy mb-2">Welcome Back</h1>
        <p className="text-slate-500 text-sm">Sign in to access your parent or staff portal.</p>
      </div>

      <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label className="block text-xs font-semibold text-brand-navy mb-1.5">Email Address</label>
          <div className="relative flex items-center">
            <Mail className="w-5 h-5 absolute left-3.5 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/20 transition-all"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-brand-navy mb-1.5">Password</label>
          <div className="relative flex items-center">
            <Lock className="w-5 h-5 absolute left-3.5 text-slate-400" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              className="w-full pl-11 pr-11 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/20 transition-all"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3.5 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-slate-600">
            <input type="checkbox" className="rounded border-slate-300 text-brand-pink focus:ring-brand-pink" />
            Remember me
          </label>
          <Link href="/reset-password" className="text-sky-500 font-medium hover:underline">
            Forgot Password?
          </Link>
        </div>

        <button
          type="submit"
          className="w-full py-3.5 rounded-xl bg-brand-pink text-white font-semibold text-sm hover:bg-brand-pinkHover transition-all shadow-md shadow-brand-pink/20 mt-2"
        >
          Log In
        </button>
      </form>
    </div>
  );
}