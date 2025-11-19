// app/kanban/[id]/page.tsx
"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import KanbanBoardWrapper from "../../components/KanbanBoardWrapper";
import api from "../../lib/api";
import { getAuth } from "../../lib/auth";

export default function KanbanPage() {
  const params = useParams();
  const id = params?.id as string | undefined; // userPredefinedGoalId
  const router = useRouter();
  const { token, user } = getAuth();

  const [refreshCounter, setRefreshCounter] = useState(0);
  const [busy, setBusy] = useState(false);

  const userId = user ? ((user as any).id ?? (user as any)._id ?? null) : null;

  async function quickAdd() {
    if (!token || !userId) {
      router.push("/auth/login");
      return;
    }

    // simple prompt-based quick add
    const title = window.prompt("Quick task title:");
    if (!title) return;
    const description = window.prompt("Optional description (leave blank to skip):") ?? null;

    setBusy(true);
    try {
      const payload: any = { title, description };
      // Quick tasks have no metadata (they're user-created)
      await api(`/api/users/${userId}/predefined-goals/${id}/kanban/tasks`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: payload,
      });

      // refresh board after create
      setRefreshCounter(c => c + 1);
    } catch (err: any) {
      console.error("Quick add failed", err);
      // show a minimal alert; replace with toast in your app
      // eslint-disable-next-line no-alert
      alert(err?.message ?? "Failed to create task");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[--color-primary]">Goal Kanban Board</h1>
          <p className="text-sm opacity-70">Visualize your roadmap tasks for this goal.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/roadmap/${id}`)}
            className="px-3 py-2 rounded-md border border-[--color-border] hover:bg-[--color-card-bg]"
          >
            View Roadmap
          </button>

          <button
            onClick={quickAdd}
            disabled={busy}
            className="px-4 py-2 rounded-md bg-[--color-primary] text-white hover:brightness-105 disabled:opacity-60 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Add Quick Task
          </button>
        </div>
      </div>

      <KanbanBoardWrapper
        userPredefinedGoalId={id}
        refreshTrigger={refreshCounter}
        onAfterAction={() => setRefreshCounter(c => c + 1)}
      />
    </div>
  );
}
