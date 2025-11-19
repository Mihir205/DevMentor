// app/auth/signup/page.tsx
"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import api from "../../lib/api"; // Assuming correct path
import { saveAuth } from "../../lib/auth"; // Assuming correct path
import Link from "next/link";
import { UserPlus, Mail, Lock, Phone, User, CheckCircle, ChevronRight } from "lucide-react";

export default function SignupPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobileNo, setMobileNo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMessage(null); // Clear previous errors

    // --- NEW VALIDATION: Mobile Number Check ---
    // Use a simple regex to check for exactly 10 digits
    const mobileRegex = /^\d{10}$/;
    if (!mobileRegex.test(mobileNo.trim())) {
      setErrorMessage("Error: Mobile number must be exactly 10 digits.");
      setLoading(false);
      return;
    }

    // --- NEW VALIDATION: Password Match Check ---
    if (password !== confirm) {
      setErrorMessage("Error: Passwords do not match.");
      setLoading(false);
      return;
    }

    try {
      const data = await api("/api/auth/register", {
        method: "POST",
        // Only send the trimmed, validated fields to the API
        body: { 
          firstName: firstName.trim(), 
          lastName: lastName.trim(), 
          mobileNo: mobileNo.trim(), 
          email: email.trim(), 
          password 
        },
      });

      if (data.token) {
        saveAuth(data.token, data.user || data);
        router.push("/goal-setup");
      } else {
        throw new Error("Registration successful, but token missing. Please try logging in.");
      }

    } catch (err: any) {
      console.error("Registration API Error:", err);
      // Fallback message for network/server errors
      setErrorMessage(err.message || "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // Consistent Tailwind classes
  const InputClass = "w-full p-3 pl-10 text-sm border border-[--color-border] rounded-lg bg-[--color-card-bg] placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[--color-primary] focus:border-[--color-primary] transition-all duration-150";
  const iconClass = "absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[--color-primary] opacity-70";
  
  const ButtonClass = `
    w-full p-3 mt-4 font-semibold rounded-lg transition-all duration-200 
    ${
      loading
        ? "bg-gray-500 text-white cursor-not-allowed opacity-70"
        : "bg-[--color-accent] text-black hover:bg-[--color-primary] hover:text-white shadow-lg hover:shadow-xl active:scale-[0.99] focus:ring-2 focus:ring-[--color-accent] focus:ring-offset-2"
    }`;

  return (
    // Outer container: Full height, use global background, centered
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-4 bg-[--color-background]">
      
      {/* Signup Card: Professional, classic, with the 'card-border' styling */}
      <div className="w-full max-w-lg p-8 rounded-xl card-border shadow-2xl">
        
        {/* Header/Branding */}
        <div className="text-center mb-8">
          <UserPlus className="w-10 h-10 mx-auto mb-3 text-[--color-accent]" />
          <h1 className="text-3xl font-extrabold tracking-tight text-[--color-foreground]">
            Join <span className="text-[--color-primary]">DevMentor</span>
          </h1>
          <p className="text-md text-[--color-foreground] opacity-70 mt-2">Start structuring your development journey today.</p>
        </div>

        {/* Error Message Display */}
        {errorMessage && (
          <div className="bg-red-500/10 border border-red-500 text-red-400 p-3 mb-6 rounded-lg text-sm font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={onSubmit}>
          
          {/* Name Fields: Side-by-side on large screens */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="relative">
              <User className={iconClass} />
              <input
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className={InputClass}
              />
            </div>
            <div className="relative">
              <User className={iconClass} />
              <input
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className={InputClass}
              />
            </div>
          </div>

          {/* Mobile & Email */}
          <div className="relative mb-4">
            <Phone className={iconClass} />
            <input
              // Use type="tel" for better mobile keyboard experience, but keep validation client-side
              type="tel"
              placeholder="Mobile Number (10 digits)"
              value={mobileNo}
              onChange={(e) => setMobileNo(e.target.value)}
              // Added pattern attribute for immediate visual feedback and browser validation
              pattern="\d{10}"
              title="Mobile number must be exactly 10 digits"
              required
              className={InputClass}
            />
          </div>
          
          <div className="relative mb-4">
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

          {/* Password Fields */}
          <div className="relative mb-4">
            <Lock className={iconClass} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={InputClass}
            />
          </div>
          <div className="relative mb-6">
            <CheckCircle className={iconClass} />
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              // Highlight border if passwords don't match (already existed, kept for visual feedback)
              className={`${InputClass} ${password && confirm && password !== confirm ? "border-red-500 ring-red-500" : ""}`}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={ButtonClass}
          >
            {loading ? "Registering..." : (
              <span className="flex items-center justify-center">
                Create Account <ChevronRight className="w-4 h-4 ml-1" />
              </span>
            )}
          </button>
        </form>

        {/* Login Link */}
        <div className="mt-8 text-center text-sm">
          <p className="text-[--color-foreground] opacity-70">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="text-[--color-accent] hover:text-[--color-primary] font-bold cursor-pointer transition-colors"
            >
              Log in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}