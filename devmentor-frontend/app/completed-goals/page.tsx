"use client";

import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { getAuth } from "../lib/auth";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle, AlertTriangle, Zap, RefreshCw } from "lucide-react";

/**
 * CompletedGoalsPage (robust)
 * - tolerant to multiple progress response shapes
 * - logs server responses for quick debugging
 * - fetches progress & selected in parallel
 */

function normalizeProgressShape(raw: any) {
  // Accept many variants returned by different server commits
  const totalTasks = Number(raw?.totalTasks ?? raw?.total_tasks ?? raw?.total_tasks_count ?? raw?.total ?? 0);
  const doneTasks = Number(raw?.doneTasks ?? raw?.done_tasks ?? raw?.done ?? 0);
  const allDone =
    raw?.allDone === true ||
    raw?.all_done === true ||
    raw?.allTasksDone === true ||
    raw?.all_tasks_done === true ||
    raw?.allSkillsDone === true ||
    raw?.all_skills_done === true ||
    Boolean(raw?.allDone);
  const totalSkills = Number(raw?.totalSkills ?? raw?.total_skills ?? raw?.skills_total ?? 0);
  const doneSkills = Number(raw?.doneSkills ?? raw?.done_skills ?? raw?.skills_done ?? 0);
  return { totalTasks, doneTasks, allDone, totalSkills, doneSkills, raw };
}

export default function CompletedGoalsPage() {
  const router = useRouter();
  const { token, user } = getAuth();
  const userId = user?.id ?? user?._id ?? null;

  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [debugLog, setDebugLog] = useState<any[]>([]);

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
      // 1) fetch selected goals
      const res = await api(`/api/users/${userId}/predefined-goals`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const selectedList = res?.userGoals ?? res ?? [];
      console.debug("[CompletedGoals] selectedList", selectedList);

      const completed: any[] = [];
      const logs: any[] = [];

      // 2) Fetch progress & selected for each concurrently (but sequential loop to keep mapping clear)
      // We'll do Promise.all for both requests per upg:
      for (const goal of selectedList) {
        // tolerant extraction of upg id
        const upgId =
          goal?.id ??
          goal?._id ??
          goal?.user_predefined_goal_id ??
          goal?.userPredefinedGoalId ??
          (goal?.user_predefined_goal ? goal.user_predefined_goal.id : undefined);

        if (!upgId) {
          logs.push({ upgId: null, note: "couldn't determine user_predefined_goal id", goal });
          continue;
        }

        // Fire both requests in parallel
        const progPromise = api(`/api/users/${userId}/predefined-goals/${upgId}/progress`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch((err) => ({ __error: true, err }));

        const selPromise = api(`/api/users/${userId}/predefined-goals/${upgId}/selected`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch((err) => ({ __error: true, err }));

        const [progRaw, selRaw] = await Promise.all([progPromise, selPromise]);

        logs.push({ upgId, progRaw, selRaw });

        // If progress returned an error object like { __error: true, err } skip but log
        if (progRaw && progRaw.__error) {
          console.warn(`[CompletedGoals] progress fetch failed for upg ${upgId}`, progRaw.err);
          continue;
        }

        // normalize shape
        const prog = normalizeProgressShape(progRaw ?? {});

        // decide 'completed' using normalized shape; prefer skill-based unlock if available:
        // you said "consider done tasks and total skills" — we'll consider completed if backend signals allDone OR (doneTasks >= totalSkills and totalSkills>0)
        let isComplete = prog.allDone;
        if (!isComplete && prog.totalSkills > 0) {
          isComplete = prog.doneTasks >= prog.totalSkills && prog.totalSkills > 0;
        }
        // also support case where totalTasks is used as canonical measure
        if (!isComplete && prog.totalTasks > 0) {
          isComplete = prog.doneTasks >= prog.totalTasks;
        }

        if (isComplete) {
          // selected project: check selRaw or selRaw.selected (server returns {selected: {...}} or 404)
          let selectedProject = null;
          if (selRaw && !selRaw.__error) {
            selectedProject = selRaw?.selected ?? selRaw ?? null;
          }
          completed.push({
            upgId,
            goal,
            progress: prog,
            selectedProject,
          });
        }
      }

      setGoals(completed);
      setDebugLog(logs);
      if (completed.length === 0) {
        // Helpful hint for the user/dev
        console.info("[CompletedGoals] no completed goals found - debug logs available in console or UI below.");
      }
    } catch (err: any) {
      console.error("Failed to load completed goals:", err);
      setError(err?.message ?? "Failed to load completed goals.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token && userId) loadCompletedGoals();
    else setLoading(false);
  }, [token, userId]);

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
            onClick={() => loadCompletedGoals()}
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
          <div className="text-gray-400 mb-4">No completed goals found.</div>

          <div className="mb-4 text-sm text-gray-600">
            Diagnostics (first 10 logs):
            <pre className="mt-2 p-2 bg-[--color-card-bg] rounded text-xs overflow-auto">
{JSON.stringify(debugLog.slice(0,10), null, 2)}
            </pre>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {goals.map((entry) => {
            const { upgId, goal, progress, selectedProject } = entry;
            const title = (goal?.title ?? goal?.predefinedGoal?.title ?? goal?.slug ?? `Goal ${upgId}`);
            const description = (goal?.description ?? goal?.predefinedGoal?.description ?? "");
            const displayProg = {
              totalTasks: progress.totalTasks,
              doneTasks: progress.doneTasks,
              totalSkills: progress.totalSkills,
              doneSkills: progress.doneSkills,
              allDone: progress.allDone,
            };

            return (
              <div key={String(upgId)} className="card-border p-5 rounded-lg shadow-md bg-[--color-card-bg]">
                <h2 className="text-xl font-bold text-[--color-accent]">{title}</h2>
                <p className="text-sm opacity-70 mt-1 line-clamp-3">{description}</p>

                <div className="mt-4 text-sm">
                  <div className="font-semibold text-green-500">
                    {displayProg.doneTasks} / {displayProg.totalSkills} tasks completed
                  </div>
                  {displayProg.totalSkills > 0 && (
                    <div className="text-xs opacity-70 mt-1">
                      Skills complete: {displayProg.doneTasks} / {displayProg.totalSkills}
                    </div>
                  )}
                </div>

                <button
                  onClick={() => {
                    // route: if project selected -> view, else go to selection page
                    if (selectedProject) router.push(`/projects/${upgId}`);
                    else router.push(`/projects/${upgId}`);
                  }}
                  className="mt-4 w-full px-4 py-2 rounded-md flex items-center justify-center gap-2 text-white bg-[--color-primary] hover:bg-[--color-accent]"
                >
                  <Zap className="w-4 h-4" />
                  {selectedProject ? "View Final Project" : "Select Final Project"}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
