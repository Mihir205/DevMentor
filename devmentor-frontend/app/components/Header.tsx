// components/Header.tsx
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
// Assuming these imports are correct based on your previous code
import { getAuth, clearAuth } from "../lib/auth"; 
import { useRouter } from "next/navigation";
import { LogOut, LayoutGrid, Zap, UserPlus, LogIn, Code } from "lucide-react"; // Importing techy icons

export default function Header() {
  const [auth, setAuth] = useState<{ token: string | null; user: any | null }>({ token: null, user: null });
  const router = useRouter();

  useEffect(() => {
    // initialize
    setAuth(getAuth());

    // handler for both storage (other tabs) and custom event (same tab)
    const onAuthChange = () => setAuth(getAuth());

    window.addEventListener("storage", onAuthChange);
    window.addEventListener("authChanged", onAuthChange);

    return () => {
      window.removeEventListener("storage", onAuthChange);
      window.removeEventListener("authChanged", onAuthChange);
    };
  }, []);

  const handleSignOut = () => {
    clearAuth();
    setAuth({ token: null, user: null }); // immediate UI update
    router.push("/");
  };

  return (
    // Header styling: Dark background, fixed height, subtle bottom border, sticky for professional feel
    <header className="sticky top-0 z-50 flex items-center justify-between h-16 px-4 md:px-6 bg-[--color-card-bg] border-b border-[--color-border] shadow-md backdrop-blur-sm bg-opacity-90">
      
      {/* 1. Logo/App Title */}
      <Link href="/" className="text-xl font-bold tracking-tight text-[--color-accent] hover:text-[--color-primary] transition-colors flex items-center gap-2">
        <Code className="h-6 w-6" />
        DevMentor
      </Link>

      {/* 2. Main Navigation */}
      <nav className="hidden sm:flex items-center space-x-4 ml-6">
        <NavLink href="/goal-setup">
          <Zap className="w-4 h-4 mr-1" /> Start Goal
        </NavLink>
        
        {auth.token ? (
          <>
            {/* These links are visible only when authenticated */}
            <NavLink href="/goals">
              <LayoutGrid className="w-4 h-4 mr-1" /> Select Goal
            </NavLink>
            <NavLink href="/progress">
              <LayoutGrid className="w-4 h-4 mr-1" /> Progress
            </NavLink>
          </>
        ) : (
          <>
            {/* Preview link for unauthenticated users */}
            <NavLink href="/preview">Preview</NavLink>
          </>
        )}
      </nav>

      {/* 3. Auth Actions / User Info (Pushed to the right) */}
      <div className="flex items-center space-x-3 md:space-x-4 ml-auto">
        {auth.token ? (
          <>
            {/* User Info - Techy & subtle */}
            <span className="text-sm font-medium text-[--color-foreground] opacity-80 hidden sm:inline">
              {auth.user?.first_name ?? auth.user?.name ?? auth.user?.email}
            </span>
            
            {/* Sign Out Button - Clean and professional */}
            <button
              onClick={handleSignOut}
              className="flex items-center px-3 py-1 text-sm font-medium text-red-400 border border-red-400 rounded-full hover:bg-red-400 hover:text-black transition-colors duration-200"
            >
              <LogOut className="w-4 h-4 mr-1" /> Sign out
            </button>
          </>
        ) : (
          <>
            {/* Login and Signup Links - Clear calls to action */}
            <NavLink href="/auth/login" className="px-3 py-1 font-semibold border-2 border-transparent hover:border-b-2 hover:border-[--color-primary] transition-all duration-150">
              <LogIn className="w-4 h-4 mr-1" /> Login
            </NavLink>
            <Link 
              href="/auth/signup" 
              className="flex items-center px-4 py-1.5 text-sm font-semibold text-black bg-[--color-accent] rounded-full hover:bg-[--color-primary] transition-colors duration-200 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
            >
              <UserPlus className="w-4 h-4 mr-1" /> Sign Up
            </Link>
          </>
        )}
      </div>
    </header>
  );
}

// Helper component for consistent nav link styling
function NavLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link 
      href={href} 
      className={`flex items-center text-sm font-medium text-[--color-foreground] opacity-80 hover:opacity-100 hover:text-[--color-accent] transition-all duration-200 border-b-2 border-transparent hover:border-[--color-accent] pb-0.5 ${className}`}
    >
      {children}
    </Link>
  );
}