import React from "react";
import Link from "next/link";
import { Mail, ArrowLeft, Send } from "lucide-react";
import { FormInput } from "@/components/auth/FormInput";

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Reset Password
        </h1>
        <p className="text-sm text-slate-500">
          Enter your registered email address to receive password reset instructions
        </p>
      </div>

      <form className="space-y-4">
        <FormInput
          id="email"
          label="Email Address"
          type="email"
          placeholder="parent@brainwave.edu"
          icon={<Mail className="h-4 w-4" />}
        />

        <button
          type="button"
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm transition-colors"
        >
          <Send className="h-4 w-4" />
          <span>Send Reset Link</span>
        </button>

        <div className="text-center pt-2 border-t border-slate-100">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Log In</span>
          </Link>
        </div>
      </form>
    </div>
  );
}
