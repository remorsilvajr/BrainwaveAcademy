"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail, Lock, LogIn, CheckCircle2, AlertCircle } from "lucide-react";
import { FormInput } from "@/components/auth/FormInput";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRegistered = searchParams.get("registered") === "true";

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        setError(result.message || "Login failed.");
        setIsSubmitting(false);
        return;
      }

      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("authUser", JSON.stringify(result.user));
      router.push("/dashboard");
    } catch {
      setError("Unable to connect to the authentication service.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Log In
        </h1>
        <p className="text-sm text-slate-500">
          Enter your credentials to access your preschool dashboard
        </p>
      </div>

      {isRegistered && (
        <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-xs font-semibold">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>Account created! Please log in.</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2.5 p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs font-semibold">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <FormInput
          id="email"
          label="Email Address"
          type="email"
          placeholder="parent@brainwave.edu"
          value={formData.email}
          onChange={handleChange}
          required
          icon={<Mail className="h-4 w-4" />}
        />

        <FormInput
          id="password"
          label="Password"
          type="password"
          placeholder="••••••••"
          value={formData.password}
          onChange={handleChange}
          required
          icon={<Lock className="h-4 w-4" />}
        />

        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 cursor-pointer text-slate-600 hover:text-slate-900">
            <input
              type="checkbox"
              className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-4 w-4"
            />
            <span>Remember me</span>
          </label>
          <Link
            href="/reset-password"
            className="font-medium text-sky-600 hover:text-sky-700 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm transition-colors cursor-pointer disabled:opacity-70"
        >
          <LogIn className="h-4 w-4" />
          <span>{isSubmitting ? "Signing in..." : "Log In"}</span>
        </button>
      </form>

      <div className="text-center pt-2 text-xs text-slate-500 border-t border-slate-100">
        Don&apos;t have an account yet?{" "}
        <Link
          href="/register"
          className="font-semibold text-sky-600 hover:text-sky-700 hover:underline"
        >
          Create Account
        </Link>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="text-center py-6 text-sm text-slate-500">Loading form...</div>}>
      <LoginContent />
    </Suspense>
  );
}
