"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "./lib/auth"; 
import api from "./lib/api"; 
import { Zap, LayoutGrid, AlertTriangle, List, Loader2, Link as LinkIcon } from "lucide-react";

type Goal = {
  id: number | string;
  title: string;
  description?: string;
  slug?: string;
};

type UserGoal = any; // Keeping this flexible based on your backend response

export default function HomePage() {
  const router = useRouter();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(true);
  const [auth, setAuth] = useState<{ token: string | null; user: any | null }>(() => getAuth());
  const [userSelections, setUserSelections] = useState<UserGoal[]>([]); // user's selected templates
  const [busyId, setBusyId] = useState<number | string | null>(null);
  const [error, setError] = useState<string | null>(null); // State for UI error messages

  // --- Utility Functions & Data Fetching (Logic retained) ---

  const reloadUserSelections = useCallback(async () => {
    setUserSelections([]);
    if (!auth?.token || !auth?.user) return;
    const userId = auth.user.id ?? auth.user._id ?? auth.user.userId;
    if (!userId) return;
    try {
      // API call logic...
      const data = await api(`/api/users/${userId}/predefined-goals`, {
        method: "GET",
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      const list = Array.isArray(data) ? data : data?.userGoals ?? data?.user_predefined_goals ?? data?.items ?? data?.userPredefinedGoals ?? [];
      setUserSelections(list);
    } catch (err) {
      console.error("[Home] reload user selections failed", err);
    }
  }, [auth.token, auth.user]);

  useEffect(() => {
    const onAuth = () => setAuth(getAuth());
    window.addEventListener("authChanged", onAuth);
    window.addEventListener("storage", onAuth);
    return () => {
      window.removeEventListener("authChanged", onAuth);
      window.removeEventListener("storage", onAuth);
    };
  }, []);

  useEffect(() => {
    const loadGoals = async () => {
      setLoadingGoals(true);
      try {
        const data = await api("/api/predefined-goals", { method: "GET" });
        const list = Array.isArray(data) ? data : data?.goals ?? data?.items ?? [];
        setGoals(list);
      } catch (err) {
        console.error("[Home] failed to load predefined goals", err);
        setError("Failed to load available goals from the server.");
        setGoals([]);
      } finally {
        setLoadingGoals(false);
      }
    };
    loadGoals();
  }, []);

  useEffect(() => {
    reloadUserSelections();
  }, [auth.token, auth.user, reloadUserSelections]);

  function findUserPredefinedGoalIdFor(predefinedId: number | string) {
    const found = userSelections.find((u: any) => {
      const pgId = u.predefined_goal_id ?? u.predefinedGoalId ?? u.predefinedGoal?.id ?? u.predefined_goal?.id;
      return String(pgId) === String(predefinedId);
    });
    return found ? (found.id ?? found._id ?? found.user_predefined_goal_id ?? found.userPredefinedGoalId ?? found.user_predefined_goal?.id) : null;
  }

  async function selectGoal(predefinedId: number | string) {
    if (!auth?.token || !auth?.user) {
      router.push("/auth/login");
      return;
    }

    const userId = auth.user.id ?? auth.user._id ?? auth.user.userId;
    if (!userId) {
      setError("User ID missing in auth info. Please log in again."); // Replaced alert()
      return;
    }

    setBusyId(predefinedId);
    setError(null); // Clear previous errors
    try {
      const payload = { predefinedGoalId: predefinedId };
      const res = await api(`/api/users/${userId}/predefined-goals`, {
        method: "POST",
        body: payload,
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      const upgId = res?.userPredefinedGoal?.id ?? res?.id ?? res?.user_predefined_goal_id ?? res?.userPredefinedGoal?._id;
      if (upgId) {
        await reloadUserSelections();
        router.push(`/roadmap/${upgId}`);
        return;
      }

      await reloadUserSelections();
      const candidate = findUserPredefinedGoalIdFor(predefinedId);
      if (candidate) {
        router.push(`/roadmap/${candidate}`);
        return;
      }

      setError("Goal selected but server did not return the new ID. Check console."); // Replaced alert()
    } catch (err: any) {
      console.error("[Home] selectGoal error:", err);
      setError(err?.message || "Failed to select goal. Please try again."); // Replaced alert()
    } finally {
      setBusyId(null);
    }
  }

  function goToRoadmap(userPredefinedGoalId: number | string) {
    router.push(`/roadmap/${userPredefinedGoalId}`);
  }
  function goToKanban(userPredefinedGoalId: number | string) {
    router.push(`/kanban/${userPredefinedGoalId}`);
  }

  // --- UI Rendering ---

  return (
    <main className="p-4 md:p-8">
      
      {/* 1. Hero Section: Futuristic & High-Contrast */}
      <header className="text-center py-16 mb-12 shadow-2xl rounded-xl border border-[--color-accent]/30 bg-[--color-card-bg] backdrop-blur-sm">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-[--color-foreground]">
          <span className="text-[--color-accent] drop-shadow-lg shadow-[--color-accent]">DEV</span>
          <span className="text-[--color-primary]">MENTOR</span>
        </h1>
        <p className="text-xl md:text-2xl mt-4 text-[--color-foreground] opacity-90 max-w-3xl mx-auto font-light">
          Engineer your future. Convert ambitious goals into structured **roadmaps** and real-time **Kanban** workflows.
        </p>
      </header>
      
      {/* Global Error Display */}
      {error && (
        <div className="flex items-center text-red-500 font-medium bg-red-500/10 border border-red-500 p-3 rounded-lg mb-8">
          <AlertTriangle className="w-5 h-5 mr-2" /> {error}
        </div>
      )}

      {/* 2. Your Selected Goals Section */}
      <section className="mb-12">
        <h2 className="text-2xl font-bold mb-6 border-b border-[--color-primary] pb-2 text-[--color-primary]">
          <List className="w-6 h-6 mr-2 inline" /> Active Roadmaps
        </h2>
        
        {!auth.token ? (
          <div className="p-6 card-border text-center text-[--color-foreground] opacity-80">
            <p>You need to log in to access your goals.</p>
            <button onClick={() => router.push("/auth/login")} className="mt-4 px-6 py-2 text-sm font-semibold rounded-lg bg-[--color-accent] text-black hover:bg-[--color-primary] hover:text-white transition-colors">
              Log In Now
            </button>
          </div>
        ) : userSelections.length === 0 ? (
          <div className="p-6 card-border text-center text-[--color-foreground] opacity-80">
            <p>You haven't activated any goals yet. Start by choosing one below!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {userSelections.map((u: any) => {
              const upgId = u.id ?? u._id ?? u.user_predefined_goal_id ?? u.userPredefinedGoal?.id;
              const title = u.title ?? u.predefinedGoal?.title ?? `Goal ${upgId}`;
              
              return (
                <div key={upgId} className="p-4 card-border flex flex-col sm:flex-row justify-between items-start sm:items-center bg-[--color-card-bg] hover:shadow-lg transition-shadow border-l-4 border-[--color-accent]">
                  <div>
                    <div className="font-bold text-lg text-[--color-foreground]">{title}</div>
                    <div className="text-xs text-[--color-foreground] opacity-60 mt-1">
                        Progress: {u.progress ? JSON.stringify(u.progress) : '0%'}
                    </div>
                  </div>
                  <div className="flex gap-3 mt-3 sm:mt-0">
                    <button onClick={() => goToRoadmap(upgId)} className="px-3 py-1 text-sm font-medium text-[--color-primary] hover:underline">
                        Roadmap
                    </button>
                    <button onClick={() => goToKanban(upgId)} className="px-3 py-1 text-sm font-medium text-[--color-accent] hover:underline">
                        Kanban
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 3. Available Goals Section */}
      <section>
        <h2 className="text-2xl font-bold mb-6 border-b border-[--color-primary] pb-2 text-[--color-primary]">
          <Zap className="w-6 h-6 mr-2 inline" /> Goal Templates Library
        </h2>

        {loadingGoals ? (
          <div className="p-6 card-border text-center text-[--color-primary] flex items-center justify-center">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Fetching templates...
          </div>
        ) : goals.length === 0 ? (
          <div className="p-6 card-border text-center text-red-500">
            No goal templates found. Check server configuration.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {goals.map((g) => {
              const userUpgId = findUserPredefinedGoalIdFor(g.id);
              const isBusy = String(busyId) === String(g.id);
              
              return (
                // Applying the "card-border" aesthetic directly to the mapped element
                <div key={g.id} className="card-border p-5 flex flex-col justify-between min-h-[180px] shadow-lg hover:shadow-xl transition-shadow duration-300">
                    <div>
                        <h3 className="text-xl font-bold mb-2 text-[--color-accent]">{g.title}</h3>
                        <p className="text-sm text-[--color-foreground] opacity-75 mb-3 leading-relaxed">{g.description}</p>
                    </div>

                    <div className="mt-4 flex gap-3 justify-end items-center border-t border-[--color-border] pt-3">
                        {/* Preview Link */}
                        <a href={`/predefined/${g.id}/roadmap`} className="flex items-center text-sm font-medium text-[--color-foreground] opacity-60 hover:text-[--color-primary] hover:opacity-100 transition-colors">
                            <LinkIcon className="w-4 h-4 mr-1" /> Preview
                        </a>

                        {userUpgId ? (
                            <>
                                {/* View buttons if already selected */}
                                <button onClick={() => goToRoadmap(userUpgId)} className="px-3 py-1 text-sm font-semibold rounded-lg border border-[--color-primary] text-[--color-primary] hover:bg-[--color-primary] hover:text-white transition-colors">
                                    Roadmap
                                </button>
                                <button onClick={() => goToKanban(userUpgId)} className="px-3 py-1 text-sm font-semibold rounded-lg bg-[--color-accent] text-black hover:bg-[--color-primary] hover:text-white transition-colors">
                                    Kanban
                                </button>
                            </>
                        ) : (
                            // Select button if not yet selected
                            <button
                                onClick={() => selectGoal(g.id)}
                                disabled={isBusy}
                                className={`
                                    flex items-center px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 shadow-md 
                                    ${isBusy
                                      ? "bg-gray-500 text-white cursor-not-allowed opacity-70"
                                      : "bg-[--color-primary] text-white hover:bg-[--color-accent] hover:text-black active:scale-[0.98]"
                                    }
                                `}
                            >
                                {isBusy ? (
                                    <span className="flex items-center">
                                        <Loader2 className="w-4 h-4 mr-1 animate-spin" /> Starting…
                                    </span>
                                ) : (
                                    <span className="flex items-center">
                                        <Zap className="w-4 h-4 mr-1" /> Select
                                    </span>
                                )}
                            </button>
                        )}
                    </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}