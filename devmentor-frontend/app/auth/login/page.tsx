// app/auth/login/page.tsx
"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api"; // Assuming correct path
import { saveAuth } from "../../lib/auth"; // Assuming correct path
import Link from "next/link";
import { User, Lock, Mail, ChevronRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  // State for displaying UI-based error messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null); 

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null); // Clear previous errors

    if (!email || !password) {
      setErrorMessage("Please enter both email and password.");
      setLoading(false);
      return;
    }

    try {
      // API call
      const data = await api("/api/auth/login", {
        method: "POST",
        body: { email, password },
      });
      
      // Ensure token is present before proceeding
      if (data.token) {
        saveAuth(data.token, data.user || data);
        router.push("/goal-setup");
      } else {
        throw new Error("Login successful, but authentication token was not returned.");
      }

    } catch (err: any) {
      console.error("Login API Error:", err);
      // Display error message in the UI instead of using alert()
      setErrorMessage(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  // Tailwind classes for consistent styling
  const InputClass = "w-full p-3 pl-10 mb-4 text-sm border border-[--color-border] rounded-lg bg-[--color-card-bg] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-[--color-primary] transition-all duration-150";
  
  const iconClass = "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[--color-primary] opacity-70";
  
  const ButtonClass = `
    w-full p-3 font-semibold rounded-lg transition-all duration-200 
    ${
      loading
        ? "bg-gray-500 text-white cursor-not-allowed opacity-70"
        : "bg-[--color-accent] text-black hover:bg-[--color-primary] hover:text-white shadow-lg hover:shadow-xl active:scale-[0.99] focus:ring-2 focus:ring-[--color-accent] focus:ring-offset-2"
    }`;

  return (
    // Outer container: Full height, use global background, centered
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-[--color-background]">
      
      {/* Login Card: Professional, classic, with the 'card-border' styling */}
      <div className="w-full max-w-md p-8 rounded-xl card-border shadow-2xl">
        
        {/* Header/Branding */}
        <div className="text-center mb-8">
          <User className="w-10 h-10 mx-auto mb-3 text-[--color-primary]" />
          <h1 className="text-3xl font-extrabold tracking-tight text-[--color-foreground]">
            Welcome Back to <span className="text-[--color-accent]">DevMentor</span>
          </h1>
          <p className="text-md text-[--color-foreground] opacity-70 mt-2">Sign in to manage your development goals.</p>
        </div>

        {/* Error Message Display */}
        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 mb-6 rounded-lg text-sm font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={onSubmit}>
          
          {/* Email Input Group */}
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

          {/* Password Input Group */}
          <div className="relative">
            <Lock className={iconClass} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={InputClass + " mb-2"}
            />
          </div>

          {/* Forgot Password Link */}
          <div className="text-right mb-6">
            <Link
              href="/auth/forgot-password" 
              className="text-xs font-medium text-[--color-primary] opacity-80 hover:opacity-100 transition duration-150 hover:underline"
            >
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={ButtonClass}
          >
            {loading ? "Authenticating..." : (
              <span className="flex items-center justify-center">
                Sign In <ChevronRight className="w-4 h-4 ml-1" />
              </span>
            )}
          </button>
        </form>

        {/* Signup Link */}
        <div className="mt-8 text-center text-sm">
          <p className="text-[--color-foreground] opacity-70">
            Don't have an account?{" "}
            <Link
              href="/auth/signup"
              className="text-[--color-accent] hover:text-[--color-primary] font-bold cursor-pointer transition-colors"
            >
              Sign up for DevMentor
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}