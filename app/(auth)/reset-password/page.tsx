"use client";

import Link from "next/link";
import { Mail, Info, Send } from "lucide-react";

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100/80 shadow-xl shadow-pink-500/5 p-8 sm:p-10">
      <div className="text-center mb-8">
        <h1 className="font-heading text-2xl sm:text-3xl font-bold text-brand-navy mb-3">
          Forgot Your Password?
        </h1>
        <p className="text-slate-500 text-xs sm:text-sm leading-relaxed">
          No worries! Enter your registered parent email address below, and we will send you a secure link to reset your account password.
        </p>
      </div>

      <form className="space-y-5" onSubmit={(e) => e.preventDefault()}>
        <div>
          <label className="block text-xs font-semibold text-brand-navy mb-1.5">Email Address</label>
          <div className="relative flex items-center">
            <Mail className="w-5 h-5 absolute left-3.5 text-slate-400" />
            <input
              type="email"
              placeholder="parent@example.com"
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-brand-pink focus:ring-2 focus:ring-brand-pink/20 transition-all"
            />
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3.5 flex items-start gap-3">
          <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600 leading-relaxed">
            Note: For security reasons, the generated reset link will expire after 15 minutes.
          </p>
        </div>

        <button
          type="submit"
          className="w-full py-3.5 rounded-xl bg-brand-pink text-white font-semibold text-sm hover:bg-brand-pinkHover transition-all shadow-md shadow-brand-pink/20 flex items-center justify-center gap-2"
        >
          Send Password Reset Link <Send className="w-4 h-4" />
        </button>

        <div className="text-center pt-2">
          <Link href="/login" className="text-xs font-medium text-slate-600 hover:text-brand-navy transition-colors">
            &larr; Back to Log In
          </Link>
        </div>
      </form>
    </div>
  );
}