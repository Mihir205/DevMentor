// app/projects/[id]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import api from "../../lib/api";
import { getAuth } from "../../lib/auth";
import { CheckCircle, XCircle, RefreshCw, Link as LinkIcon } from "lucide-react";

function normalizeProgressShape(raw: any) {
  const totalTasks = Number(raw?.totalTasks ?? raw?.total_tasks ?? raw?.total ?? 0);
  const doneTasks = Number(raw?.doneTasks ?? raw?.done_tasks ?? raw?.done ?? 0);
  const totalSkills = Number(raw?.totalSkills ?? raw?.total_skills ?? raw?.skills_total ?? 0);
  const doneSkills = Number(raw?.doneSkills ?? raw?.done_skills ?? raw?.skills_done ?? 0);
  const allDone =
    raw?.allDone === true ||
    raw?.all_done === true ||
    raw?.allTasksDone === true ||
    raw?.all_tasks_done === true ||
    raw?.allSkillsDone === true ||
    raw?.all_skills_done === true ||
    Boolean(raw?.allDone);
  return { totalTasks, doneTasks, totalSkills, doneSkills, allDone, raw };
}

function computeProgressPercent(p: { totalTasks: number; doneTasks: number; totalSkills: number; doneSkills: number }) {
  const { totalTasks, doneTasks, totalSkills } = p;
  if (totalSkills > 0) {
    return Math.max(0, Math.min(100, Math.round((doneTasks / totalSkills) * 100)));
  }
  if (totalTasks > 0) {
    return Math.max(0, Math.min(100, Math.round((doneTasks / totalTasks) * 100)));
  }
  return 0;
}

export default function ProjectsPage() {
  const params = useParams();
  const id = params?.id as string; // userPredefinedGoalId
  const router = useRouter();
  const { token, user } = getAuth();
  const userId = user ? ((user as any).id ?? (user as any)._id ?? null) : null;

  const [loading, setLoading] = useState(true);
  const [progressRaw, setProgressRaw] = useState<any | null>(null);
  const [progressNormalized, setProgressNormalized] = useState<any | null>(null);
  const [percent, setPercent] = useState<number>(0);

  const [suggestions, setSuggestions] = useState<any[] | null>(null);
  const [selected, setSelected] = useState<any | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // If you want to forcibly allow selection from UI even when progress < 100%
  // set this to true. Backend may still reject if it enforces all-done.
  const forceSelectFromUI = false; // <--- toggle if desired

  async function loadAll() {
    setLoading(true);
    setError(null);
    setInfo(null);

    if (!token || !userId) {
      // not auth'd, push to login
      router.push("/auth/login");
      return;
    }

    try {
      // 1) get progress
      const p = await api(`/api/users/${userId}/predefined-goals/${id}/progress`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      setProgressRaw(p ?? null);
      const norm = normalizeProgressShape(p ?? {});
      setProgressNormalized(norm);
      const pct = computeProgressPercent(norm);
      setPercent(pct);

      // 2) suggestions (final projects)
      const s = await api(`/api/users/${userId}/predefined-goals/${id}/suggestions`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuggestions(s?.suggestions ?? s ?? []);

      // 3) selected project (may 404 if none)
      try {
        const sel = await api(`/api/users/${userId}/predefined-goals/${id}/selected`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (sel?.selected) setSelected(sel.selected);
        else setSelected(null);
      } catch (err) {
        // ignore 404/no selection
        setSelected(null);
      }
    } catch (err: any) {
      console.error("ProjectsPage load error", err);
      setError(err?.message ?? "Failed to load projects");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token, userId]);

  async function chooseProject(predefProjectId: number) {
    if (!token || !userId) {
      router.push("/auth/login");
      return;
    }

    // If project is selectable only after 100% progress and we are below, prevent unless forced
    if (!forceSelectFromUI && percent < 100) {
      setError("You must reach 100% progress to select a final project from the UI. Refresh progress when done.");
      return;
    }

    // confirm
    const ok = window.confirm("Select this final project? This will make it the selected final project for your roadmap.");
    if (!ok) return;

    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      const body = { predefinedProjectId: predefProjectId };
      // send JSON-ish body through your api helper (which probably JSON.stringify internally)
      const resp = await api(`/api/users/${userId}/predefined-goals/${id}/select-project`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body,
      });

      if (resp?.ok) {
        setInfo("Project selected — returning to Kanban...");
        // refresh selection locally for immediate feedback
        await loadAll();
        setTimeout(() => router.push(`/kanban/${id}`), 700);
      } else {
        // backend returned ok:false shape
        setError(resp?.error ?? "Failed to select project");
      }
    } catch (err: any) {
      console.error("chooseProject error", err);
      // show backend error message if available
      const msg = err?.message ?? (err?.body && (err.body.error || err.body.message)) ?? "Selection request failed";
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <div>Loading project suggestions...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="mb-3 text-red-600 flex items-center gap-2"><XCircle className="w-5 h-5" /> Error</div>
        <div className="text-sm">{error}</div>
        <div className="mt-4">
          <button onClick={() => loadAll()} className="px-3 py-2 rounded border">Retry</button>
        </div>
      </div>
    );
  }

  const showPercent = percent;
  const progTotalDisplay = progressNormalized?.totalSkills ?? progressNormalized?.totalTasks ?? 0;
  const progDoneDisplay = progressNormalized?.doneTasks ?? 0;
  const locked = showPercent < 100 && !forceSelectFromUI;

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Final Projects</h1>
        <p className="text-sm opacity-70">Pick a final project to work on — it will appear on your Kanban after selection.</p>
      </div>

      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <div className="col-span-2 p-4 border rounded-md bg-[--color-card-bg]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Progress</div>
              <div className="text-xs opacity-70">{progDoneDisplay} / {progTotalDisplay} completed</div>
            </div>
            <div className="text-xl font-extrabold text-[--color-accent]">{showPercent}%</div>
          </div>

          <div className="mt-3">
            <div className={`h-2 w-full bg-[--color-border] rounded overflow-hidden`}>
              <div style={{ width: `${showPercent}%` }} className="h-full bg-[--color-primary] rounded" />
            </div>
            {locked ? (
              <div className="mt-3 text-sm text-yellow-700 bg-yellow-50 p-3 rounded">
                Projects are locked until progress reaches 100%. Refresh progress after completing tasks.
              </div>
            ) : (
              <div className="mt-3 text-sm text-green-700 bg-green-50 p-3 rounded">
                {showPercent >= 100 ? "100% — You can select a final project." : "Final projects are available."}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border rounded-md bg-[--color-card-bg]">
          <div className="font-semibold">Selected Project</div>
          {selected ? (
            <div className="mt-3">
              <div className="font-bold text-[--color-accent]">{selected.title}</div>
              {selected.description && <div className="text-sm opacity-80 mt-1">{selected.description}</div>}
              <div className="text-xs opacity-70 mt-2">Difficulty: {selected.difficulty ?? "Unknown"}</div>
              {selected.link && <div className="mt-2"><a href={selected.link} target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-2"><LinkIcon className="w-4 h-4" /> Starter link</a></div>}
              <div className="mt-3">
                <button onClick={() => { setSelected(null); setInfo("Change selection below"); }} className="px-3 py-2 rounded bg-[--color-primary] text-white">Change selection</button>
              </div>
            </div>
          ) : (
            <div className="mt-3 text-sm opacity-70">No project selected yet. Pick one from the list.</div>
          )}
        </div>
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-semibold">Available Final Projects</h2>
        <p className="text-sm opacity-70">These are suggested final projects for this goal. Click a card for details.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {(!suggestions || suggestions.length === 0) && <div className="p-4 text-sm opacity-70 border rounded">No final projects are defined for this goal.</div>}

        {suggestions?.map((s) => {
          const selectedFlag = selected && (String(selected.predefined_project_id ?? selected.id) === String(s.id) || String(selected.id) === String(s.id));
          return (
            <div key={s.id} className={`p-4 border rounded-md bg-[--color-card-bg] flex flex-col justify-between ${selectedFlag ? "ring-2 ring-[--color-primary]" : ""}`}>
              <div>
                <div className="text-lg font-semibold">{s.title}</div>
                {s.description && <div className="text-sm opacity-80 mt-2">{s.description}</div>}
                <div className="mt-2 text-xs opacity-70">Difficulty: {s.difficulty ?? "Unknown"}</div>
                {s.estimated_time && <div className="text-xs opacity-60 mt-1">Est: {s.estimated_time}</div>}
                {s.link && <div className="mt-2 text-xs"><a href={s.link} target="_blank" rel="noreferrer" className="underline inline-flex items-center gap-2"><LinkIcon className="w-4 h-4" /> Details</a></div>}
              </div>

              <div className="mt-4 flex items-center justify-between">
                <div className="text-[11px] opacity-60">ID: {s.id}</div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={busy || Boolean(selected) || locked}
                    onClick={() => chooseProject(s.id)}
                    className={`px-3 py-2 rounded ${busy || Boolean(selected) || locked ? "bg-[--color-border] text-[--color-foreground] cursor-not-allowed" : "bg-[--color-primary] text-white"}`}
                  >
                    {busy ? "Selecting..." : selectedFlag ? "Selected" : "Select this project"}
                  </button>

                  <button
                    onClick={() => {
                      // show details in a modal or navigate to a project detail route -- for now open the link if available,
                      // or expand inline via route to `/projects/${id}/view` if you implement that route. We'll show inline detail toggling.
                      // Simpler: navigate to Kanban and let Kanban show it — but requirement: "when view button in completed-goals redirect to project page"
                      // So this page is that project page, and you can inspect details here.
                      setInfo(`Project: ${s.title} — difficulty: ${s.difficulty ?? "Unknown"}.`);
                    }}
                    className="px-3 py-2 rounded border"
                  >
                    View
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {info && <div className="mt-6 p-3 bg-green-50 border border-green-200 rounded text-sm">{info}</div>}
    </div>
  );
}
