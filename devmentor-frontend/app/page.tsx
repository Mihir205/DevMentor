// app/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getAuth } from "./lib/auth";
import api from "./lib/api";
import {
  Zap,
  LayoutGrid,
  AlertTriangle,
  List,
  Loader2,
  Link as LinkIcon,
  TrendingUp,
  Target,
  Rocket,
  Code,
  Brain,
  Sparkles,
} from "lucide-react";

type Goal = {
  id: number | string;
  title: string;
  description?: string;
  slug?: string;
};

type UserGoal = any;

export default function HomePage() {
  const router = useRouter();

  const [goals, setGoals] = useState<Goal[]>([]);
  const [loadingGoals, setLoadingGoals] = useState(true);

  const [auth, setAuth] = useState<{ token: string | null; user: any | null }>({ token: null, user: null });
  const [userSelections, setUserSelections] = useState<UserGoal[]>([]);
  const [busyId, setBusyId] = useState<number | string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hoveredGoal, setHoveredGoal] = useState<number | string | null>(null);

  // progress map keyed by user_predefined_goal_id (upg id)
  // store both task-based and skill-based numbers because API returns both
  const [progressMap, setProgressMap] = useState<
    Record<
      string,
      {
        totalTasks: number;
        doneTasks: number;
        allTasksDone?: boolean;
        totalSkills?: number;
        doneSkills?: number;
        allSkillsDone?: boolean;
        allDone?: boolean;
      }
    >
  >({});

  useEffect(() => {
    const current = getAuth();
    setAuth(current);
    const onAuth = () => setAuth(getAuth());
    window.addEventListener("authChanged", onAuth);
    window.addEventListener("storage", onAuth);
    return () => {
      window.removeEventListener("authChanged", onAuth);
      window.removeEventListener("storage", onAuth);
    };
  }, []);

  // load predefined goal templates
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingGoals(true);
      try {
        const data = await api("/api/predefined-goals", { method: "GET" });
        const list: Goal[] = Array.isArray(data) ? data : data?.goals ?? data?.items ?? [];
        if (!cancelled) setGoals(list);
      } catch (err) {
        console.error("[Home] failed to load predefined goals", err);
        if (!cancelled) {
          setError("Failed to load available goals from the server.");
          setGoals([]);
        }
      } finally {
        if (!cancelled) setLoadingGoals(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // reload user's selected goals (user_predefined_goals) and fetch progress for each
  const reloadUserSelections = useCallback(async () => {
    setUserSelections([]);
    setProgressMap({});
    if (!auth?.token || !auth?.user) return;
    const userId = auth.user.id ?? auth.user._id ?? auth.user.userId;
    if (!userId) return;
    try {
      const data = await api(`/api/users/${userId}/predefined-goals`, {
        method: "GET",
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      const list: UserGoal[] = Array.isArray(data) ? data : data?.userGoals ?? data?.user_predefined_goals ?? data?.items ?? [];
      setUserSelections(list);

      // fetch progress for each user_predefined_goal concurrently
      const upgIds = list
        .map((u) => u.id ?? u._id ?? u.user_predefined_goal_id ?? u.userPredefinedGoalId)
        .filter(Boolean);
      if (upgIds.length === 0) return;

      const progressPromises = upgIds.map((upgId) =>
        api(`/api/users/${userId}/predefined-goals/${upgId}/progress`, {
          method: "GET",
          headers: { Authorization: `Bearer ${auth.token}` },
        })
          .then((p: any) => ({ upgId, p }))
          .catch((e: any) => {
            console.warn("progress fetch failed for", upgId, e);
            // return zeros so UI remains stable
            return {
              upgId,
              p: { totalTasks: 0, doneTasks: 0, allTasksDone: false, totalSkills: 0, doneSkills: 0, allSkillsDone: false, allDone: false },
            };
          })
      );

      const results = await Promise.all(progressPromises);
      const map: Record<string, any> = {};
      for (const r of results) {
        const key = String(r.upgId);
        const raw = r.p ?? {};
        map[key] = {
          totalTasks: Number(raw.totalTasks ?? raw.total_tasks ?? 0),
          doneTasks: Number(raw.doneTasks ?? raw.done_tasks ?? 0),
          allTasksDone: Boolean(raw.allTasksDone ?? raw.all_tasks_done ?? false),
          totalSkills: Number(raw.totalSkills ?? raw.total_skills ?? 0),
          doneSkills: Number(raw.doneSkills ?? raw.done_skills ?? 0),
          allSkillsDone: Boolean(raw.allSkillsDone ?? raw.all_skills_done ?? false),
          allDone: Boolean(raw.allDone ?? raw.all_done ?? false),
        };
      }
      setProgressMap(map);
    } catch (err) {
      console.error("[Home] reload user selections failed", err);
    }
  }, [auth?.token, auth?.user]);

  useEffect(() => {
    reloadUserSelections();
  }, [auth?.token, auth?.user, reloadUserSelections]);

  // utility: find upg id for a predefined template id (if user selected it)
  function findUserPredefinedGoalIdFor(predefinedId: number | string) {
    const found = userSelections.find((u: any) => {
      const pgId =
        u.predefined_goal_id ??
        u.predefinedGoalId ??
        u.predefined_goal?.id ??
        u.predefinedGoal?.id ??
        (u.predefined_goal_id ?? u.predefined_goal_id);
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
      setError("User ID missing in auth info. Please log in again.");
      return;
    }

    setBusyId(predefinedId);
    setError(null);
    try {
      const payload = { predefinedGoalId: predefinedId };
      const res = await api(`/api/users/${userId}/predefined-goals`, {
        method: "POST",
        body: payload,
        headers: { Authorization: `Bearer ${auth.token}` },
      });

      const upgId = res?.userPredefinedGoal?.id ?? res?.id ?? res?.user_predefined_goal_id ?? res?.userPredefinedGoal?._id;
      await reloadUserSelections();
      if (upgId) {
        router.push(`/roadmap/${upgId}`);
        return;
      }
      const candidate = findUserPredefinedGoalIdFor(predefinedId);
      if (candidate) {
        router.push(`/roadmap/${candidate}`);
        return;
      }
      setError("Goal selected but server did not return the new ID. Check console.");
    } catch (err: any) {
      console.error("[Home] selectGoal error:", err);
      setError(err?.message || "Failed to select goal. Please try again.");
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

  const getGoalIcon = (index: number) => {
    const icons = [Code, Brain, Rocket, Target, TrendingUp, Sparkles];
    const Icon = icons[index % icons.length];
    return <Icon className="w-8 h-8" />;
  };

  // compute suggested templates (not selected), max 3
  const suggestedTemplates = (() => {
    const selectedPredefinedIds = new Set(
      userSelections.map((u) => String(u.predefined_goal_id ?? u.predefinedGoalId ?? u.predefined_goal?.id ?? u.predefinedGoal?.id ?? ""))
    );
    const filtered = goals.filter((g) => !selectedPredefinedIds.has(String(g.id)));
    return filtered.slice(0, 3);
  })();

  // helper to display progress percentage for a upg
  function percentForUpg(upgId: any) {
    const key = String(upgId);
    const p = progressMap[key];
    if (!p) return { pct: 0, text: "0% Complete" };

    const totalSkills = Number(p.totalSkills ?? 0);
    const doneSkills = Number(p.doneSkills ?? 0);
    const totalTasks = Number(p.totalTasks ?? 0);
    const doneTasks = Number(p.doneTasks ?? 0);

    // NEW LOGIC
    if (totalSkills > 0 && doneSkills > 0) {
      const pct = Math.round((doneTasks / totalSkills) * 100);
      return { pct, text: `${pct}% Complete` };
    }

    // fallback
    if (totalTasks > 0) {
      const pct = Math.round((doneTasks / totalSkills) * 100);
      return { pct, text: `${pct}% Complete` };
    }

    return { pct: 0, text: "0% Complete" };
  }


  return (
    <main className="homepage-container">
      {/* Hero Section */}
      <header className="hero-section">
        <div className="hero-background">
          <div className="hero-grid"></div>
          <div className="hero-gradient"></div>
        </div>

        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles className="w-4 h-4" />
            <span>Your Learning Companion</span>
          </div>

          <h1 className="hero-title">
            <span className="hero-title-dev">DEV</span>
            <span className="hero-title-mentor">MENTOR</span>
          </h1>

          <p className="hero-subtitle">
            Transform your ambitious goals into structured <span className="highlight">roadmaps</span> and actionable{" "}
            <span className="highlight">Kanban workflows</span>. Your journey to mastery starts here.
          </p>

          <div className="hero-stats">
            <div className="stat-item">
              <Target className="w-6 h-6" />
              <div>
                <div className="stat-number">{goals.length}+</div>
                <div className="stat-label">Goal Templates</div>
              </div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <TrendingUp className="w-6 h-6" />
              <div>
                <div className="stat-number">{userSelections.length}</div>
                <div className="stat-label">Active Roadmaps</div>
              </div>
            </div>
            <div className="stat-divider"></div>
            <div className="stat-item">
              <Rocket className="w-6 h-6" />
              <div>
                <div className="stat-number">∞</div>
                <div className="stat-label">Possibilities</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="error-banner">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {/* Active Roadmaps Section */}
      <section className="section-container">
        <div className="section-header">
          <div className="section-title-wrapper">
            <List className="section-icon" />
            <h2 className="section-title">Active Roadmaps</h2>
          </div>
          <div className="section-count">{userSelections.length} active</div>
        </div>

        {!auth.token ? (
          <div className="empty-state">
            <div className="empty-icon">🔐</div>
            <h3 className="empty-title">Authentication Required</h3>
            <p className="empty-description">Log in to access your personalized roadmaps and track your progress.</p>
            <button onClick={() => router.push("/auth/login")} className="cta-button cta-primary">
              <Zap className="w-4 h-4" />
              Log In Now
            </button>
          </div>
        ) : userSelections.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">🎯</div>
            <h3 className="empty-title">No Active Goals Yet</h3>
            <p className="empty-description">Start your learning journey by selecting a goal template below!</p>
          </div>
        ) : (
          <div className="active-goals-grid">
            {userSelections.map((u: any) => {
              const upgId = u.id ?? u._id ?? u.user_predefined_goal_id ?? u.userPredefinedGoal?.id;
              const title = u.title ?? u.predefinedGoal?.title ?? u.predefined_goal?.title ?? `Goal ${upgId}`;
              const prog = percentForUpg(upgId);
              return (
                <div key={String(upgId)} className="active-goal-card">
                  <div className="active-goal-header">
                    <div className="active-goal-icon">
                      <Target className="w-5 h-5" />
                    </div>
                    <div className="active-goal-info">
                      <h3 className="active-goal-title">{title}</h3>
                      <div className="active-goal-progress">
                        <div className="progress-bar-container">
                          <div className="progress-bar-fill" style={{ width: `${prog.pct}%` }} />
                        </div>
                        <span className="progress-text">{prog.text}</span>
                      </div>
                    </div>
                  </div>

                  <div className="active-goal-actions">
                    <button onClick={() => goToRoadmap(upgId)} className="goal-action-btn goal-action-roadmap">
                      <LayoutGrid className="w-4 h-4" />
                      Roadmap
                    </button>
                    <button onClick={() => goToKanban(upgId)} className="goal-action-btn goal-action-kanban">
                      <List className="w-4 h-4" />
                      Kanban
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Explore / Suggested Templates Section */}
      <section className="section-container">
        <div className="section-header">
          <div className="section-title-wrapper">
            <Sparkles className="section-icon" />
            <h2 className="section-title">Explore Goal Templates</h2>
          </div>
          <div className="section-subtitle">Curated learning paths for every ambition</div>
        </div>

        {loadingGoals ? (
          <div className="loading-state">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p>Loading templates...</p>
          </div>
        ) : goals.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <h3 className="empty-title">No Templates Available</h3>
            <p className="empty-description">Check your server configuration.</p>
          </div>
        ) : (
          <>
            {/* Render only the suggested templates (max 3) */}
            <div className="suggested-templates-grid">
              {suggestedTemplates.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">✨</div>
                  <h3 className="empty-title">You're up to date</h3>
                  <p className="empty-description">You have selected all available templates — explore the full catalog if you like.</p>
                  <button onClick={() => router.push("/goal-setup")} className="cta-button">
                    Browse all templates
                  </button>
                </div>
              ) : (
                suggestedTemplates.map((g, index) => {
                  const isBusy = String(busyId) === String(g.id);
                  return (
                    <div
                      key={g.id}
                      className="goal-template-card suggested"
                      onMouseEnter={() => setHoveredGoal(g.id)}
                      onMouseLeave={() => setHoveredGoal(null)}
                    >
                      <div className="goal-template-header">
                        <div className="goal-template-icon">{getGoalIcon(index)}</div>
                        <a href={`/predefined/${g.id}/roadmap`} className="goal-preview-link">
                          <LinkIcon className="w-4 h-4" />
                          Preview
                        </a>
                      </div>

                      <div className="goal-template-content">
                        <h3 className="goal-template-title">{g.title}</h3>
                        <p className="goal-template-description">{g.description}</p>
                      </div>

                      <div className="goal-template-footer">
                        <button
                          onClick={() => selectGoal(g.id)}
                          disabled={isBusy}
                          className={`template-select-btn ${isBusy ? "template-select-busy" : ""}`}
                        >
                          {isBusy ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              <span>Starting...</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-5 h-5" />
                              <span>Start Journey</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* small CTA to view full catalog */}
            <div className="mt-6 flex justify-center">
              <button onClick={() => router.push("/goal-setup")} className="px-4 py-2 rounded border hover:bg-[--color-card-bg]">
                Browse all templates
              </button>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
