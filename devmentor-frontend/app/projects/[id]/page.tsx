"use client";
import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import api from "../../lib/api";
import { getAuth } from "../../lib/auth";
import { CheckCircle, XCircle } from "lucide-react";

export default function ProjectsPage() {
  const params = useParams();
  const id = params?.id as string; // userPredefinedGoalId
  const router = useRouter();
  const { token, user } = getAuth();
  const userId = user ? ((user as any).id ?? (user as any)._id ?? null) : null;

  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<{ totalTasks: number; doneTasks: number; allDone: boolean } | null>(null);
  const [suggestions, setSuggestions] = useState<any[] | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      if (!token || !userId) {
        router.push("/auth/login");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // 1) progress check (server side excludes project-tasks)
        const p = await api(`/api/users/${userId}/predefined-goals/${id}/progress`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        const allDone = Boolean(p?.allDone);
        setProgress({ totalTasks: Number(p?.totalTasks ?? 0), doneTasks: Number(p?.doneTasks ?? 0), allDone });

        // if progress not completed, redirect back to kanban
        if (!allDone) {
          router.push(`/kanban/${id}`);
          return;
        }

        // 2) fetch suggestions
        const s = await api(`/api/users/${userId}/predefined-goals/${id}/suggestions`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuggestions(s?.suggestions ?? []);

        // 3) fetch selected if exists (endpoint optional)
        try {
          const sel = await api(`/api/users/${userId}/predefined-goals/${id}/selected`, {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          });
          if (sel?.selected) setSelected(sel.selected);
        } catch (err) {
          // endpoint might 404 if not selected yet — ignore
          setSelected(null);
        }
      } catch (err: any) {
        console.error("init projects page", err);
        setError(err?.message ?? "Failed to load projects");
      } finally {
        setLoading(false);
      }
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token, userId]);

  async function chooseProject(predefProjectId: number) {
    if (!token || !userId) {
      router.push("/auth/login");
      return;
    }
    // confirm
    const ok = window.confirm("Select this final project? You can change it later but this will unlock it on your Kanban.");
    if (!ok) return;

    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      const body = { predefinedProjectId: predefProjectId };
      const r = await api(`/api/users/${userId}/predefined-goals/${id}/select-project`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });

      if (r?.ok) {
        // show a small info and redirect back to kanban so selected project appears there
        setInfo("Project selected — returning to Kanban...");
        // short delay to let user see feedback
        setTimeout(() => {
          router.push(`/kanban/${id}`);
        }, 700);
      } else {
        setError(r?.error ?? "Failed to select project");
      }
    } catch (err: any) {
      console.error("chooseProject", err);
      setError(err?.message ?? "Failed to select project");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="p-6">Loading projects...</div>;
  if (error) return (
    <div className="p-6">
      <div className="mb-3 text-red-600 flex items-center gap-2"><XCircle className="w-5 h-5" /> Error</div>
      <div className="text-sm">{error}</div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Final Projects</h1>
        <p className="text-sm opacity-70">You unlocked these by completing all roadmap tasks. Pick one final project to work on.</p>
      </div>

      <div className="mb-6">
        <div className="text-sm font-medium">Progress</div>
        <div className="text-xs opacity-70">{progress?.doneTasks} / {progress?.totalTasks} tasks done</div>
      </div>

      {selected ? (
        <div className="mb-6 p-4 border rounded-md bg-[--color-card-bg]">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <div className="font-semibold">Currently Selected Project</div>
              <div className="text-sm opacity-80">{selected.title}</div>
            </div>
          </div>
          {selected.description && <div className="text-xs opacity-70 mb-2">{selected.description}</div>}
          <div className="text-xs opacity-60">Difficulty: {selected.difficulty}</div>
          {selected.link && <div className="text-xs mt-2"><a href={selected.link} target="_blank" rel="noreferrer" className="underline">Starter link</a></div>}
          <div className="mt-3">
            <button
              onClick={() => {
                // allow re-select: go to bottom where suggestions are and let user pick another
                setSelected(null);
                setInfo("Choose a new project from the list below.");
              }}
              className="px-3 py-2 rounded bg-[--color-primary] text-white"
            >
              Change selection
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(!suggestions || suggestions.length === 0) && <div className="p-4 text-sm opacity-70">No final projects defined for this goal.</div>}
        {suggestions?.map(s => (
          <div key={s.id} className="p-4 border rounded-md bg-[--color-card-bg] flex flex-col justify-between">
            <div>
              <div className="text-lg font-semibold">{s.title}</div>
              {s.description && <div className="text-sm opacity-80 mt-2">{s.description}</div>}
              <div className="text-xs opacity-60 mt-3">Difficulty: {s.difficulty}</div>
              {s.link && <div className="text-xs mt-1"><a href={s.link} target="_blank" rel="noreferrer" className="underline">Starter link</a></div>}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <button
                disabled={busy || Boolean(selected)}
                onClick={() => chooseProject(s.id)}
                className={`px-3 py-2 rounded ${busy || Boolean(selected) ? "bg-[--color-border] text-[--color-foreground] cursor-not-allowed" : "bg-[--color-primary] text-white"}`}
              >
                {busy ? "Selecting..." : "Select this project"}
              </button>

              <div className="text-[10px] opacity-60">ID: {s.id}</div>
            </div>
          </div>
        ))}
      </div>

      {info && <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded text-sm">{info}</div>}
    </div>
  );
}
