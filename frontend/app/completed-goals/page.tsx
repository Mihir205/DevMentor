// app/completed-goals/page.tsx  (client component)
"use client";

import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { getAuth } from "../lib/auth";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle, AlertTriangle, Zap, RefreshCw } from "lucide-react";

function normalizeProgress(raw: any) {
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

function computePercentFromProgress(p: { totalTasks: number; doneTasks: number; totalSkills: number; doneSkills: number }) {
  const { totalTasks, doneTasks, totalSkills } = p;
  let pct = 0;
  if (totalSkills > 0) {
    pct = Math.round((doneTasks / totalSkills) * 100);
  } else if (totalTasks > 0) {
    pct = Math.round((doneTasks / totalTasks) * 100);
  } else {
    pct = 0;
  }
  return Math.max(0, Math.min(100, pct));
}

export default function CompletedGoalsPage() {
  const router = useRouter();

  // mounted guard avoids server/client mismatch (hydrate with neutral placeholder)
  const [mounted, setMounted] = useState(false);

  // auth and data state
  const { token, user } = getAuth();
  const userId = user?.id ?? user?._id ?? null;

  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<any[]>([]);

  useEffect(() => {
    // mark mounted on client only
    setMounted(true);
  }, []);

  // load completed goals only after client mount to avoid hydration differences
  useEffect(() => {
    if (!mounted) return;

    async function loadCompletedGoals() {
      setLoading(true);
      setError(null);
      setGoals([]);
      setDebugLog([]);

      if (!token || !userId) {
        setError("Not authenticated");
        setLoading(false);
        return;
      }

      try {
        const res = await api(`/api/users/${userId}/predefined-goals`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const selectedList: any[] = Array.isArray(res) ? res : res?.userGoals ?? res?.user_predefined_goals ?? res ?? [];
        if (!Array.isArray(selectedList) || selectedList.length === 0) {
          setDebugLog([{ note: "No selected goals returned", selectedList }]);
          setGoals([]);
          setLoading(false);
          return;
        }

        const upgPairs = selectedList.map((goal) => {
          const upgId =
            goal?.id ??
            goal?._id ??
            goal?.user_predefined_goal_id ??
            goal?.userPredefinedGoalId ??
            (goal?.user_predefined_goal ? goal.user_predefined_goal.id : undefined);
          return { goal, upgId };
        });

        const calls = upgPairs.map(async ({ goal, upgId }) => {
          if (!upgId) return { upgId: null, goal, progErr: "missing_upgId" };

          const progPromise = api(`/api/users/${userId}/predefined-goals/${upgId}/progress`, {
            headers: { Authorization: `Bearer ${token}` },
          }).catch((err) => ({ __error: true, err }));

          const selPromise = api(`/api/users/${userId}/predefined-goals/${upgId}/selected`, {
            headers: { Authorization: `Bearer ${token}` },
          }).catch((err) => ({ __error: true, err }));

          const [progRaw, selRaw] = await Promise.all([progPromise, selPromise]);
          return { upgId, goal, progRaw, selRaw };
        });

        const allResults = await Promise.all(calls);
        const debug: any[] = [];
        const completed: any[] = [];

        for (const r of allResults) {
          const { upgId, goal, progRaw, selRaw } = r as any;
          if (!upgId) {
            debug.push({ upgId: null, reason: "no upgId", goal });
            continue;
          }
          if (progRaw && progRaw.__error) {
            debug.push({ upgId, note: "progress_fetch_error", err: progRaw.err });
            continue;
          }

          const prog = normalizeProgress(progRaw ?? {});
          const percent = computePercentFromProgress(prog);
          debug.push({ upgId, progRaw, progNormalized: prog, percent });

          if (percent >= 100) {
            let selectedProject = null;
            if (selRaw && !selRaw.__error) selectedProject = selRaw?.selected ?? selRaw ?? null;

            const title = goal?.title ?? goal?.predefinedGoal?.title ?? `Goal ${upgId}`;
            const description = goal?.description ?? goal?.predefinedGoal?.description ?? "";

            completed.push({
              upgId,
              title,
              description,
              progress: prog,
              percent,
              selectedProject: selectedProject ?? null,
              rawGoal: goal,
            });
          }
        }

        setDebugLog(debug);
        setGoals(completed);
        setLoading(false);
      } catch (err: any) {
        console.error("loadCompletedGoals error", err);
        setError(err?.message ?? "Failed to load completed goals");
        setLoading(false);
      }
    }

    loadCompletedGoals();
  }, [mounted, token, userId]);

  // While server and client mount handshake happens, render a neutral placeholder to avoid mismatch
  if (!mounted) {
    return (
      <div className="p-6 md:p-10">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin" />
          <div>Preparing completed goals…</div>
        </div>
      </div>
    );
  }

  // after mounted, render the real UI
  if (!token) {
    return (
      <div className="p-6 text-center text-red-400">
        Please log in to view completed goals.
      </div>
    );
  }

  return (
    <div className="p-6 md:p-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-extrabold flex items-center gap-2">
          <CheckCircle className="w-8 h-8 text-green-500" /> Completed Goals
        </h1>

        <div className="flex gap-2">
          <button
            onClick={() => {
              setLoading(true);
              setError(null);
              setGoals([]);
              setDebugLog([]);
              // re-run effect by toggling mounted briefly (call load by setting mounted true is enough)
              // simpler: just call the same effect via a manual call:
              (async () => {
                setLoading(true);
                setError(null);
                setGoals([]);
                setDebugLog([]);
                // call the same loader inside effect? easiest is to reload page
                // but to avoid full reload, simply call the useEffect loader by toggling a small state.
                // For brevity, reload window (safe for admin/dev).
                window.location.reload();
              })();
            }}
            className="px-3 py-2 rounded border hover:bg-[--color-card-bg] flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-4 border rounded text-red-400 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-[--color-primary]">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading completed goals…
        </div>
      ) : goals.length === 0 ? (
        <div>
          <div className="text-gray-400 mb-4">No completed goals found (progress should be 100%).</div>

          <div className="mb-4 text-sm text-gray-600">
            Diagnostics (first 20 log entries):
            <pre className="mt-2 p-2 bg-[--color-card-bg] rounded text-xs overflow-auto">
{JSON.stringify(debugLog.slice(0,20), null, 2)}
            </pre>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {goals.map((g) => (
            <div key={String(g.upgId)} className="card-border p-5 rounded-lg shadow-md bg-[--color-card-bg]">
              <h2 className="text-xl font-bold text-[--color-accent]">{g.title}</h2>
              <p className="text-sm opacity-70 mt-1 line-clamp-3">{g.description}</p>

              <div className="mt-4 text-sm">
                <div className="font-semibold text-green-500">{g.progress.doneTasks} of {g.progress.totalSkills || g.progress.totalTasks} completed</div>
                <div className="text-xs opacity-70 mt-1">Computed progress: {g.percent}%</div>
              </div>

              <button
                onClick={() => {
                  if (g.selectedProject) router.push(`/projects/${g.upgId}`);
                  else router.push(`/projects/${g.upgId}`);
                }}
                className="mt-4 w-full px-4 py-2 rounded-md flex items-center justify-center gap-2 text-white bg-[--color-primary] hover:bg-[--color-accent]"
              >
                <Zap className="w-4 h-4" />
                {g.selectedProject ? "View Final Project" : "Select Final Project"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
