"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { User, Mail, Lock, UserPlus } from "lucide-react";
import { FormInput } from "@/components/auth/FormInput";

export default function RegisterPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    firstName: "",
    middleName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Store user data in localStorage
    const mockUser = {
      firstName: formData.firstName || "Parent",
      middleName: formData.middleName || "",
      lastName: formData.lastName || "User",
      email: formData.email,
      role: "Parent",
    };

    localStorage.setItem("mockUser", JSON.stringify(mockUser));

    // Immediately redirect to login page with registered query parameter
    router.push("/login?registered=true");
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Create Account
        </h1>
        <p className="text-sm text-slate-500">
          Register your parent portal account for Brainwave Academy
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <FormInput
            id="firstName"
            label="First Name"
            placeholder="Jane"
            value={formData.firstName}
            onChange={handleChange}
            required
            icon={<User className="h-4 w-4" />}
          />

          <FormInput
            id="middleName"
            label="Middle Name"
            placeholder="Marie"
            value={formData.middleName}
            onChange={handleChange}
            icon={<User className="h-4 w-4" />}
          />

          <FormInput
            id="lastName"
            label="Last Name"
            placeholder="Doe"
            value={formData.lastName}
            onChange={handleChange}
            required
            icon={<User className="h-4 w-4" />}
          />
        </div>

        <FormInput
          id="email"
          label="Email Address"
          type="email"
          placeholder="jane.doe@example.com"
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

        <div className="pt-2">
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-semibold text-sm transition-colors cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            <span>Create Account</span>
          </button>
        </div>
      </form>

      <div className="text-center pt-2 text-xs text-slate-500 border-t border-slate-100">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-semibold text-sky-600 hover:text-sky-700 hover:underline"
        >
          Log In
        </Link>
      </div>
    </div>
  );
}
