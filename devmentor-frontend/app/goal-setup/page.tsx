"use client";
import React, { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
// REMOVED: import GoalCard from "../components/GoalCard"; 
import { getAuth } from "../lib/auth";
import { useRouter } from "next/navigation";
import { PlusCircle, Loader2, AlertTriangle, Zap, Edit, Link as LinkIcon } from "lucide-react";

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

  // --- Logic (Retained) ---

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

  useEffect(() => { loadGoals(); }, [loadGoals, auth.token]);

  async function startGoal(id: number | string) {
    const token = auth.token;
    const user = auth.user;
    if (!user || !token) {
      router.push("/auth/login");
      return;
    }
    setError(null);
    setStartingId(id);
    
    try {
      const payload = { predefinedGoalId: id };
      const userId = user.id ?? user._id;

      const res = await api(`/api/users/${userId}/predefined-goals`, {
        method: "POST",
        body: payload,
        headers: { Authorization: `Bearer ${token}` },
      });

      const upgId = res?.userPredefinedGoal?.id ?? res?.id ?? res?.user_predefined_goal_id ?? res?.userPredefinedGoal?._id ?? res?.createdId;

      if (upgId) {
        router.push(`/roadmap/${upgId}`);
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

  const handleCreateCustom = () => {
    // Implement navigation to your custom goal creation form here
    router.push("/goal-setup/new");
  };
  
  const currentGoalId = (g: any) => g.id ?? g._id;
  const isStarting = (id: number | string) => String(startingId) === String(id);
  
  // --- UI Rendering ---
  
  return (
    <div className="p-4 md:p-8">
      
      {/* Header */}
      <header className="mb-8 border-b border-[--color-border] pb-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-[--color-foreground]">
          <Zap className="w-8 h-8 mr-2 inline text-[--color-accent]" /> Select or Create Goal
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

        {/* 1. Create Custom Goal Card (Primary CTA) */}
        <div 
          onClick={handleCreateCustom}
          className="card-border p-6 flex flex-col items-center justify-center min-h-[180px] text-center border-2 border-dashed border-[--color-primary] cursor-pointer bg-[--color-card-bg] hover:bg-[--color-primary]/10 transition-all duration-300"
        >
          <PlusCircle className="w-10 h-10 text-[--color-primary] mb-3" />
          <div className="text-xl font-bold text-[--color-primary] mb-1">
            Create Custom Goal
          </div>
          <p className="text-sm text-[--color-foreground] opacity-75">
            Design a unique roadmap from scratch.
          </p>
          <button className="mt-4 px-4 py-2 text-sm font-semibold rounded-lg bg-[--color-primary] text-white hover:bg-[--color-accent] hover:text-black transition-colors">
            <Edit className="w-4 h-4 mr-1 inline" /> Define Now
          </button>
        </div>

        {/* 2. Predefined Goals List */}
        {loading ? (
          <div className="p-6 card-border text-center text-[--color-primary] flex items-center justify-center col-span-full">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading goal templates...
          </div>
        ) : goals.length === 0 ? (
          <div className="p-6 card-border text-center text-[--color-foreground] opacity-70 col-span-full">
            No predefined goals available. Start by creating a custom one!
          </div>
        ) : (
          goals.map((g: any) => (
            // APPLYING STYLING DIRECTLY TO THE MAPPED DIV (Goal Card alternative)
            <div 
                key={currentGoalId(g)} 
                className="card-border p-5 flex flex-col justify-between min-h-[180px] shadow-lg hover:shadow-xl transition-shadow duration-300"
            >
                {/* Card Content Area */}
                <div>
                    <h3 className="text-xl font-bold mb-2 text-[--color-accent]">{g.title}</h3>
                    <p className="text-sm text-[--color-foreground] opacity-75 mb-3 leading-relaxed">{g.description}</p>
                </div>

                {/* Card Actions Area */}
                <div className="mt-4 flex gap-3 justify-end items-center border-t border-[--color-border] pt-3">
                    <button 
                        onClick={(e) => { e.stopPropagation(); router.push(`/predefined/${currentGoalId(g)}/roadmap`); }}
                        className="px-3 py-1 text-sm font-medium text-[--color-primary] hover:underline"
                    >
                        <LinkIcon className="w-4 h-4 mr-1 inline" /> Preview
                    </button>
                    
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
                </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}