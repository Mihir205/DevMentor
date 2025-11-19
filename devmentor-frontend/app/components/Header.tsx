// components/Header.tsx
"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getAuth, clearAuth } from "../lib/auth";
import { LogOut, LayoutGrid, Zap, UserPlus, LogIn, Code } from "lucide-react";

export default function Header() {
  const pathname = usePathname() ?? "";
  const router = useRouter();

  // Hide header for admin routes
  if (pathname.startsWith("/admin")) return null;

  const [auth, setAuth] = useState<{ token: string | null; user: any | null }>({ token: null, user: null });

  useEffect(() => {
    // read initial auth from localStorage (via your helper)
    setAuth(getAuth());

    const onAuthChange = () => setAuth(getAuth());
    // listen for changes from other tabs and same-tab events
    window.addEventListener("storage", onAuthChange);
    window.addEventListener("authChanged", onAuthChange);
    return () => {
      window.removeEventListener("storage", onAuthChange);
      window.removeEventListener("authChanged", onAuthChange);
    };
  }, []);

  const handleSignOut = () => {
    try {
      clearAuth();
    } catch (e) {
      // fallback: try to clear localStorage keys we expect
      try {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
      } catch (e2) { /* ignore */ }
    }
    // notify other listeners
    window.dispatchEvent(new Event("authChanged"));
    setAuth({ token: null, user: null });
    router.push("/"); // send to home (or /auth/login if you prefer)
  };

  return (
    <header className="sticky top-0 z-50 flex items-center justify-between h-16 px-4 md:px-6 bg-[--color-card-bg] border-b border-[--color-border] shadow-md backdrop-blur-sm bg-opacity-90">
      {/* Logo / title */}
      <Link href="/" className="text-xl font-bold tracking-tight text-[--color-accent] hover:text-[--color-primary] transition-colors flex items-center gap-2">
        <Code className="h-6 w-6" />
        DevMentor
      </Link>

      {/* Main navigation */}
      <nav className="hidden sm:flex items-center space-x-4 ml-6">
        <NavLink href="/goal-setup">
          <LayoutGrid className="w-4 h-4 mr-1" /> Select Goal
        </NavLink>

        {auth.token ? (
          <>
            <NavLink href="/completed-goals">
              <LayoutGrid className="w-4 h-4 mr-1" /> Completed Goals
            </NavLink>
          </>
        ) : (
          <>
            <NavLink href="/preview">Preview</NavLink>
          </>
        )}
      </nav>

      {/* Auth area */}
      <div className="flex items-center space-x-3 md:space-x-4 ml-auto">
        {auth.token ? (
          <>
            <span className="text-sm font-medium text-[--color-foreground] opacity-80 hidden sm:inline">
              {auth.user?.first_name ?? auth.user?.name ?? auth.user?.email}
            </span>

            <button
              onClick={handleSignOut}
              className="flex items-center px-3 py-1 text-sm font-medium text-red-400 border border-red-400 rounded-full hover:bg-red-400 hover:text-black transition-colors duration-200"
              title="Sign out"
            >
              <LogOut className="w-4 h-4 mr-1" /> Sign out
            </button>
          </>
        ) : (
          <>
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
