"use client";
import React, { useEffect, useState } from "react";
import api from "../../../lib/api";
import { getAuth } from "../../../lib/auth";
import { useRouter, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AdminUserDetailPage() {
  const params = useParams();
  const id = params?.id;
  const router = useRouter();
  const { token } = getAuth();

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!token) { setError("Not authenticated"); setLoading(false); return; }
      setLoading(true);
      try {
        const res = await api(`/api/admin/users/${id}`, { headers: { Authorization: `Bearer ${token}` } });
        setUser(res?.user ?? null);
      } catch (err: any) {
        console.error("admin get user", err);
        setError(err?.message || "Failed to load user");
      } finally { setLoading(false); }
    }
    if (id) load();
  }, [id, token]);

  if (!token) return <div className="p-6">Please log in as admin.</div>;

  return (
    <div className="p-6">
      <button onClick={() => router.push("/admin/users")} className="mb-4 text-sm underline">← Back to users</button>
      {loading ? <div className="flex items-center gap-2"><Loader2 className="animate-spin" /> Loading...</div> : null}
      {error && <div className="text-red-600">{error}</div>}

      {user && (
        <>
          <h2 className="text-xl font-bold mb-2">{user.name} <span className="text-sm opacity-70">({user.email})</span></h2>
          <div className="mb-4 text-xs opacity-70">Created: {new Date(user.created_at).toLocaleString()}</div>

          <div>
            <h3 className="font-semibold mb-2">Selected Goals</h3>
            {user.selected_goals.length === 0 && <div className="text-sm opacity-70">No selected goals.</div>}
            <div className="space-y-3">
              {user.selected_goals.map((g: any) => (
                <div key={g.user_predefined_goal_id} className="p-3 border rounded">
                  <div className="flex justify-between">
                    <div>
                      <div className="font-semibold">{g.title}</div>
                      {g.description && <div className="text-xs opacity-70">{g.description}</div>}
                      <div className="text-xs opacity-60 mt-1">Tasks: {g.doneTasks} / {g.totalTasks} — Completed: {String(g.allDone)}</div>
                    </div>
                    <div className="text-xs opacity-60">UPG: {g.user_predefined_goal_id}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
