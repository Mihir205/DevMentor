// app/admin/users/page.tsx
"use client";
import React, { useEffect, useState } from "react";
import api from "../../lib/api";
import { getAuth } from "../../lib/auth";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AdminUsersPage() {
  const router = useRouter();

  // mounted -> indicates we're running on the client after hydration
  const [mounted, setMounted] = useState(false);

  // auth + users state (only managed on client after mount)
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any | null>(null);

  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  // On first client mount, read auth and then load users if admin
  useEffect(() => {
    setMounted(true);

    const auth = getAuth();
    setToken(auth?.token ?? null);
    setCurrentUser(auth?.user ?? null);

    // if no token, stop loading and show login prompt
    if (!auth?.token) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    async function loadUsers() {
      setLoading(true);
      setError(null);
      try {
        const res = await api("/api/admin/users", {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        if (cancelled) return;
        setUsers(res?.users ?? []);
      } catch (err: any) {
        console.error("admin load users", err);
        // show friendly error
        setError(err?.message || "Failed to load users");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadUsers();

    return () => {
      cancelled = true;
    };
  }, []);

  // While server rendering (or before hydration) show a stable loading UI
  if (!mounted) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 text-[--color-foreground]">
          <Loader2 className="animate-spin" />
          <span>Loading admin panel…</span>
        </div>
      </div>
    );
  }

  // After mount: no token -> prompt to login (client-only)
  if (!token) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-4">Admin — Users</h1>
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
          <div className="font-medium mb-1">Not authenticated</div>
          <div className="text-sm opacity-80">Please sign in using an admin account to view this page.</div>
        </div>
      </div>
    );
  }

  // Authenticated admin view
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Admin — Users</h1>

      {loading ? (
        <div className="flex items-center gap-2 mb-4">
          <Loader2 className="animate-spin" />
          <span>Loading users…</span>
        </div>
      ) : null}

      {error && <div className="text-red-600 mb-4">{error}</div>}

      <div className="space-y-3">
        {users.map((u) => (
          <div key={u.user_id} className="p-4 border rounded flex justify-between items-center">
            <div>
              <div className="font-semibold">
                {u.name ?? `User ${u.user_id}`}{" "}
                <span className="text-xs text-gray-500">({u.email})</span>
              </div>
              <div className="text-xs opacity-70">Selected goals: {Array.isArray(u.selected_goals) ? u.selected_goals.length : 0}</div>
            </div>
            <div>
              <button
                onClick={() => router.push(`/admin/users/${u.user_id}`)}
                className="px-3 py-1 rounded bg-[--color-primary] text-white"
              >
                View
              </button>
            </div>
          </div>
        ))}

        {!loading && users.length === 0 && <div className="text-sm opacity-70">No users found.</div>}
      </div>
    </div>
  );
}
