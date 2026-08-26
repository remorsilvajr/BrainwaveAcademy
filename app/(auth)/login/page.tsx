"use client";

import { loginUser } from "./actions";
import { useState } from "react";
import Link from "next/link";
import { siteConfig } from "@/config/siteConfig";

export default function LoginPage() {
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setMessage("");

    const result = await loginUser(formData);
    if (result.success && result.redirectTo) {
      window.location.href = result.redirectTo;
    }

    setMessage(result.message);
    if (!result.success) {
      setPassword("");
    }
    setIsLoading(false);
  };

  return (
    <main
      className="min-h-screen w-full bg-cover bg-top bg-no-repeat flex items-center justify-center p-4 font-body"
      style={{ backgroundImage: "url('/assets/logbg3.png')" }}
    >
      {/* Centered Login Card */}
      <div className="w-full max-w-[420px] bg-white/95 backdrop-blur-sm rounded-card border border-black/10 p-8 shadow-2xl flex flex-col items-center">

        {/* Logo & Branding */}
        <Link href="/" className="mb-2">
          <img
            src="/assets/bwa_logo.png"
            alt={`${siteConfig.name} Logo`}
            className="w-[120px] h-auto object-contain"
          />
        </Link>

        <h1 className="font-heading text-[28px] font-extrabold text-brand-primary mb-1 text-center">
          Portal Login
        </h1>
        <p className="font-body text-[14px] text-gray-600 mb-6 text-center">
          Enter your credentials to access your account
        </p>

        {/* Form Container */}
        <form action={handleSubmit} className="w-full space-y-4">

          {/* Email Field */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="font-button text-[14px] font-semibold text-gray-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 font-body text-[15px] focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all"
            />
          </div>

          {/* Password Field */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className="font-button text-[14px] font-semibold text-gray-700">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 font-body text-[15px] focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 transition-all"
            />
          </div>

          {/* Server Response Message */}
          {message && (
            <div className="p-3 text-[14px] font-body rounded-lg bg-brand-secondary/40 text-brand-primary border border-brand-primary/20 text-center">
              {message}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-brand-primary text-white font-button text-[18px] font-semibold rounded-btn hover:bg-blue-800 transition-colors shadow-md disabled:opacity-50 mt-2"
          >
            {isLoading ? "Signing in..." : "Login"}
          </button>
        </form>

        <Link
          href="/"
          className="mt-6 font-button text-[14px] text-gray-500 hover:text-brand-primary transition-colors"
        >
          &larr; Back to Main Page
        </Link>
      </div>
    </main>
  );
}