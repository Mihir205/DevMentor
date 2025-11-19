"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api";
import { saveAuth } from "../../lib/auth";
import Link from "next/link";
import { User, Lock, Mail, ChevronRight, Eye, EyeOff } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      setLoading(false);
      return;
    }

    try {
      const data = await api("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });

      if (!data?.token) {
        setErrorMessage("Invalid Credentials.");
        setLoading(false);
        return;
      }

      const user = data.user;
      saveAuth(data.token, user);

      // --- ADMIN REDIRECT ---
      if (user.isAdmin || user.is_admin) {
        router.push("/admin/users");
        return;
      }

      // --- USER HAS EXISTING GOALS? ---
      try {
        const goalsResp = await api(`/api/users/${user.id}/predefined-goals`, {
          method: "GET",
          headers: { Authorization: `Bearer ${data.token}` }
        });

        const userGoals = goalsResp?.userGoals ?? goalsResp ?? [];

        if (Array.isArray(userGoals) && userGoals.length > 0) {
          // user has a goal → go to home
          router.push("/");
        } else {
          // user has no goals → go to goal setup
          router.push("/goal-setup");
        }
        return;

      } catch (goalErr) {
        console.warn("Failed to check user goals:", goalErr);
        router.push("/goal-setup"); // fallback
      }

    } catch (err: any) {
      const serverBody = err?.body ?? err?.response ?? null;
      const serverMsg = serverBody?.error ?? serverBody?.message ?? null;
      setErrorMessage(serverMsg || err?.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const InputClass =
    "w-full p-3 pl-10 mb-4 text-sm border border-[--color-border] rounded-lg bg-[--color-card-bg] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[--color-primary] transition-all";

  const iconClass =
    "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[--color-primary] opacity-70";

  const ButtonClass = `
    w-full p-3 font-semibold rounded-lg transition-all duration-200 
    ${loading
      ? "bg-gray-500 text-white opacity-70 cursor-not-allowed"
      : "bg-[--color-accent] text-black hover:bg-[--color-primary] hover:text-white shadow-lg active:scale-95"
    }
  `;

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-[--color-background]">
      <div className="w-full max-w-md p-8 rounded-xl card-border shadow-2xl">
        
        {/* Header */}
        <div className="text-center mb-8">
          <User className="w-10 h-10 mx-auto mb-3 text-[--color-primary]" />
          <h1 className="text-3xl font-extrabold tracking-tight text-[--color-foreground]">
            Welcome Back to <span className="text-[--color-accent]">DevMentor</span>
          </h1>
          <p className="text-md text-[--color-foreground] opacity-70 mt-2">
            Sign in to continue your journey.
          </p>
        </div>

        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 mb-6 rounded-lg text-sm font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={onSubmit}>
          <div className="relative">
            <Mail className={iconClass} />
            <input
              type="email"
              placeholder="Email Address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={InputClass}
            />
          </div>

          {/* Password Field */}
          <div className="relative">
            <Lock className={iconClass} />
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={InputClass + " mb-6"}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 opacity-60 hover:opacity-100"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          <button type="submit" disabled={loading} className={ButtonClass}>
            {loading ? "Authenticating..." : (
              <span className="flex items-center justify-center">
                Sign In <ChevronRight className="w-4 h-4 ml-1" />
              </span>
            )}
          </button>
        </form>

        <div className="mt-8 text-center text-sm">
          <p className="text-[--color-foreground] opacity-70">
            Don't have an account?{" "}
            <Link
              href="/auth/signup"
              className="text-[--color-accent] hover:text-[--color-primary] font-bold"
            >
              Register now
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}