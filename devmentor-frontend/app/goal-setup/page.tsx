"use client";
import React, { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { getAuth } from "../lib/auth";
import { useRouter } from "next/navigation";
import { PlusCircle, Loader2, AlertTriangle, Zap, Link as LinkIcon } from "lucide-react";

type Goal = {
  id: number | string;
  title: string;
  description?: string;
  slug?: string;
};

export default function GoalSetupPage() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingId, setStartingId] = useState<number | string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const [auth, setAuth] = useState<{ token: string | null; user: any | null }>(() => getAuth());

  // map of predefined_goal_id -> user_predefined_goal_id when user already selected a template
  const [selectedMap, setSelectedMap] = useState<Record<string, number>>({});

  useEffect(() => {
    const onAuth = () => setAuth(getAuth());
    window.addEventListener("authChanged", onAuth);
    window.addEventListener("storage", onAuth);
    return () => {
      window.removeEventListener("authChanged", onAuth);
      window.removeEventListener("storage", onAuth);
    };
  }, []);

  const loadGoals = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api("/api/predefined-goals");
      const list: Goal[] = Array.isArray(data) ? data : 
                           Array.isArray((data as any).goals) ? (data as any).goals :
                           (data as any).data ?? [];
      setGoals(list);
    } catch (e: any) {
      console.error("[GoalSetup] failed to load predefined goals:", e);
      setError(e?.message || "Failed to load goal templates.");
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // load user's selected templates (if logged in) and build selectedMap
  const loadUserSelections = useCallback(async () => {
    try {
      const { token, user } = getAuth();
      if (!token || !user) {
        setSelectedMap({});
        return;
      }
      const userId = user.id ?? user._id;
      const res = await api(`/api/users/${userId}/predefined-goals`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      // res.userGoals expected to be array with fields: user_predefined_goal_id, predefined_goal_id, ...
      const arr = Array.isArray(res?.userGoals) ? res.userGoals : res?.user_goals ?? [];
      const map: Record<string, number> = {};
      for (const item of arr) {
        const predefinedId = item.predefined_goal_id ?? item.predefinedGoalId ?? item.predefinedGoal?.id;
        const upgId = item.user_predefined_goal_id ?? item.userPredefinedGoalId ?? item.id ?? item.upg_id;
        if (predefinedId != null && upgId != null) {
          map[String(predefinedId)] = Number(upgId);
        } else if (item.predefined_goal_id && item.user_predefined_goal_id) {
          map[String(item.predefined_goal_id)] = Number(item.user_predefined_goal_id);
        }
      }
      setSelectedMap(map);
    } catch (err) {
      console.warn("loadUserSelections failed", err);
      setSelectedMap({});
    }
  }, []);

  useEffect(() => {
    loadGoals();
    loadUserSelections();
    // re-run when auth changes (simple approach)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.token]);

  async function startGoal(predefinedGoalId: number | string) {
    const { token, user } = getAuth();
    if (!user || !token) {
      router.push("/auth/login");
      return;
    }

    // if already selected, navigate to roadmap (use mapped upg id)
    const existingUpgId = selectedMap[String(predefinedGoalId)];
    if (existingUpgId) {
      router.push(`/roadmap/${existingUpgId}`);
      return;
    }

    setError(null);
    setStartingId(predefinedGoalId);

    try {
      const payload = { predefinedGoalId };
      const userId = user.id ?? user._id;

      const res = await api(`/api/users/${userId}/predefined-goals`, {
        method: "POST",
        body: payload,
        headers: { Authorization: `Bearer ${token}` },
      });

      // try to derive returned userPredefinedGoal id from a few shapes
      const upgId = res?.userPredefinedGoal?.id ?? res?.userPredefinedGoal?.user_predefined_goal_id
                  ?? res?.userPredefinedGoal?.user_predefined_goal_id ?? res?.userPredefinedGoal?.id
                  ?? res?.userPredefinedGoalId ?? res?.user_predefined_goal_id
                  ?? res?.userPredefinedGoal?.id ?? res?.userPredefinedGoalId ?? res?.id
                  ?? res?.userPredefinedGoal?.user_predefined_goal_id;

      // The controller returns userPredefinedGoal in "userPredefinedGoal" or "userPredefinedGoal" shapes.
      // If we cannot parse it, fallback to refreshing selections and directing user to roadmap list.
      if (upgId) {
        // refresh selected map and navigate to roadmap for this created UPG
        await loadUserSelections();
        router.push(`/roadmap/${upgId}`);
        return;
      }

      // fallback: refresh selections and attempt to find newly created mapping
      await loadUserSelections();
      const mapped = selectedMap[String(predefinedGoalId)];
      if (mapped) {
        router.push(`/roadmap/${mapped}`);
        return;
      }

      setError("Goal started, but server ID confirmation failed.");
    } catch (err: any) {
      console.error("[GoalSetup] startGoal error:", err);
      setError(err?.message || "Failed to start goal. Please try again.");
    } finally {
      setStartingId(null);
    }
  }

  const currentGoalId = (g: any) => g.id ?? g._id;
  const isStarting = (id: number | string) => String(startingId) === String(id);

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <header className="mb-8 border-b border-[--color-border] pb-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-[--color-foreground]">
          <Zap className="w-8 h-8 mr-2 inline text-[--color-accent]" /> Select a Goal
        </h1>
        <p className="text-md text-[--color-foreground] opacity-70 mt-1">
          Pick a template to begin instantly, or define your own path.
        </p>
      </header>

      {/* Error Display */}
      {error && (
        <div className="flex items-center text-red-500 font-medium bg-red-500/10 border border-red-500 p-3 rounded-lg mb-8">
          <AlertTriangle className="w-5 h-5 mr-2" /> {error}
        </div>
      )}

      {/* Grid Container for Templates and Custom Goal Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {loading ? (
          <div className="p-6 card-border text-center text-[--color-primary] flex items-center justify-center col-span-full">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading goal templates...
          </div>
        ) : goals.length === 0 ? (
          <div className="p-6 card-border text-center text-[--color-foreground] opacity-70 col-span-full">
            No predefined goals available. Start by creating a custom one!
          </div>
        ) : (
          goals.map((g: any) => {
            const pid = String(currentGoalId(g));
            const upgId = selectedMap[pid]; // undefined if not selected
            return (
              <div
                key={pid}
                className="card-border p-5 flex flex-col justify-between min-h-[180px] shadow-lg hover:shadow-xl transition-shadow duration-300"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-xl font-bold mb-2 text-[--color-accent]">{g.title}</h3>
                    {upgId ? (
                      <div className="text-xs px-2 py-0.5 rounded-full bg-[--color-border] text-[--color-foreground] opacity-90">Selected</div>
                    ) : null}
                  </div>

                  <p className="text-sm text-[--color-foreground] opacity-75 mb-3 leading-relaxed">{g.description}</p>
                </div>

                <div className="mt-4 flex gap-3 justify-end items-center border-t border-[--color-border] pt-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); router.push(`/predefined/${currentGoalId(g)}/roadmap`); }}
                    className="px-3 py-1 text-sm font-medium text-[--color-primary] hover:underline"
                  >
                    <LinkIcon className="w-4 h-4 mr-1 inline" /> Preview
                  </button>

                  {upgId ? (
                    // user already selected this template -> show "View progress / roadmap"
                    <button
                      onClick={() => router.push(`/roadmap/${upgId}`)}
                      className="flex items-center px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 shadow-md bg-[--color-border] text-[--color-foreground]"
                    >
                      <LinkIcon className="w-4 h-4 mr-1" /> View
                    </button>
                  ) : (
                    <button
                      onClick={() => startGoal(currentGoalId(g))}
                      disabled={isStarting(currentGoalId(g))}
                      className={`
                        flex items-center px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 shadow-md 
                        ${isStarting(currentGoalId(g))
                          ? "bg-gray-500 text-white cursor-not-allowed opacity-70"
                          : "bg-[--color-accent] text-black hover:bg-[--color-primary] hover:text-white active:scale-[0.98]"
                        }
                      `}
                    >
                      {isStarting(currentGoalId(g)) ? (
                        <span className="flex items-center">
                          <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Starting…
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <Zap className="w-4 h-4 mr-1" /> Select Template
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
