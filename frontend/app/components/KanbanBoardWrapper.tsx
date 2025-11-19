// components/KanbanBoardWrapper.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import api from "../lib/api";
import { getAuth } from "../lib/auth";
import "../styles/KanbanBoard.css";
import {
  RefreshCw,
  Zap,
  XCircle,
  Link as LinkIcon,
  CheckCircle,
  Target,
  TrendingUp,
  Lock,
  Sparkles,
} from "lucide-react";

type TaskRow = any;
type Column = { id: string | number; title: string; statusKey: string; tasks: TaskRow[] };

const DEFAULT_COLUMN_ORDER = ["todo", "inprogress", "done"];
const PRETTY_TITLE: Record<string, string> = {
  todo: "To Do",
  inprogress: "In Progress",
  done: "Done",
};

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "done":
      return "text-green-500 bg-green-500/10 border-green-500/30";
    case "inprogress":
      return "text-[--color-primary] bg-[--color-primary]/10 border-[--color-primary]/30";
    default:
      return "text-gray-500 bg-gray-500/10 border-gray-500/30";
  }
};

const getColumnIcon = (statusKey: string) => {
  switch (statusKey.toLowerCase()) {
    case "done":
      return "✓";
    case "inprogress":
      return "⚡";
    default:
      return "○";
  }
};

export default function KanbanBoardWrapper({
  userPredefinedGoalId,
  refreshTrigger,
  onAfterAction,
}: {
  userPredefinedGoalId?: string | number | string[] | null;
  refreshTrigger?: number;
  onAfterAction?: () => void;
}) {
  const router = useRouter();
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token, user } = getAuth();
  const userId = user ? ((user as any).id ?? (user as any)._id ?? null) : null;

  const [suggestions, setSuggestions] = useState<any[] | null>(null);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [selectingProject, setSelectingProject] = useState<number | null>(null);

  const [progressInfo, setProgressInfo] = useState<{
    totalTasks?: number;
    doneTasks?: number;
    totalSkills?: number;
    doneSkills?: number;
  } | null>(null);

  const [selectedProject, setSelectedProject] = useState<any | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const buildColumnsFromKanban = (kb: any): Column[] => {
    const isArray = (v: any) => Array.isArray(v);
    if (kb?.groups && typeof kb.groups === "object") {
      const order = DEFAULT_COLUMN_ORDER;
      const base = order.map((k) => ({
        id: `col-${k}`,
        statusKey: k,
        title: PRETTY_TITLE[k] ?? (k[0].toUpperCase() + k.slice(1)),
        tasks: isArray(kb.groups[k]) ? kb.groups[k] : isArray(kb[k]) ? kb[k] : [],
      }));
      const extras = Object.keys(kb.groups).filter((k) => !order.includes(k) && k !== "blocked");
      extras.forEach((k) =>
        base.push({
          id: `col-${k}`,
          statusKey: k,
          title: PRETTY_TITLE[k] ?? k,
          tasks: isArray(kb.groups[k]) ? kb.groups[k] : [],
        })
      );
      return base;
    }

    const hasDirectColumns = DEFAULT_COLUMN_ORDER.some((k) => isArray(kb[k]));
    if (hasDirectColumns) {
      const base = DEFAULT_COLUMN_ORDER.map((k) => ({
        id: `col-${k}`,
        statusKey: k,
        title: PRETTY_TITLE[k] ?? (k[0].toUpperCase() + k.slice(1)),
        tasks: isArray(kb[k]) ? kb[k] : [],
      }));
      const extras = Object.keys(kb).filter((k) => !DEFAULT_COLUMN_ORDER.includes(k) && k !== "blocked");
      extras.forEach((k) =>
        base.push({
          id: `col-${k}`,
          statusKey: k,
          title: PRETTY_TITLE[k] ?? k,
          tasks: isArray(kb[k]) ? kb[k] : [],
        })
      );
      return base;
    }

    if (Array.isArray(kb?.tasks)) {
      const grouped: Record<string, TaskRow[]> = { todo: [], inprogress: [], done: [] };
      for (const r of kb.tasks) {
        const s = (r.status ?? "todo").toLowerCase();
        if (s !== "blocked" && !grouped[s]) grouped[s] = [];
        if (s !== "blocked") grouped[s].push(r);
      }
      return DEFAULT_COLUMN_ORDER.map((k) => ({
        id: `col-${k}`,
        statusKey: k,
        title: PRETTY_TITLE[k] ?? k,
        tasks: grouped[k] ?? [],
      }));
    }

    return DEFAULT_COLUMN_ORDER.map((k) => ({ id: `col-${k}`, statusKey: k, title: PRETTY_TITLE[k], tasks: [] }));
  };

  const fetchBoard = useCallback(async () => {
    if (!userPredefinedGoalId || !token || !userId) {
      setColumns(DEFAULT_COLUMN_ORDER.map((k) => ({ id: `col-${k}`, statusKey: k, title: PRETTY_TITLE[k], tasks: [] })));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const endpoint = `/api/users/${userId}/predefined-goals/${userPredefinedGoalId}/kanban`;
      const resp = await api(endpoint, { method: "GET", headers: { Authorization: `Bearer ${token}` } });
      const kb = resp?.kanban ?? resp ?? {};
      const cols = buildColumnsFromKanban(kb);
      setColumns(cols.map((c) => ({ id: c.id, statusKey: c.statusKey, title: c.title, tasks: Array.isArray(c.tasks) ? c.tasks : [] })));
    } catch (err: any) {
      console.error("Kanban fetch error:", err);
      setError(err?.message ?? "Failed to fetch kanban board");
      setColumns(DEFAULT_COLUMN_ORDER.map((k) => ({ id: `col-${k}`, statusKey: k, title: PRETTY_TITLE[k], tasks: [] })));
    } finally {
      setLoading(false);
    }
  }, [userPredefinedGoalId, token, userId]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard, refreshTrigger]);

  const fetchSuggestions = useCallback(async () => {
    if (!userPredefinedGoalId || !token || !userId) {
      setSuggestions([]);
      return;
    }
    setLoadingSuggestions(true);
    try {
      const resp = await api(`/api/users/${userId}/predefined-goals/${userPredefinedGoalId}/suggestions`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuggestions(resp?.suggestions ?? []);
    } catch (err) {
      console.error("fetch suggestions failed", err);
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  }, [userPredefinedGoalId, token, userId]);

  useEffect(() => {
    fetchSuggestions();
  }, [fetchSuggestions, refreshTrigger]);

  const fetchSelectedProject = useCallback(async () => {
    if (!userPredefinedGoalId || !token || !userId) {
      setSelectedProject(null);
      return;
    }
    try {
      const res = await api(`/api/users/${userId}/predefined-goals/${userPredefinedGoalId}/selected`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res?.selected) setSelectedProject(res.selected);
      else setSelectedProject(null);
    } catch (err) {
      setSelectedProject(null);
    }
  }, [userPredefinedGoalId, token, userId]);

  useEffect(() => {
    fetchSelectedProject();
  }, [fetchSelectedProject, refreshTrigger]);

  const checkProgress = useCallback(async () => {
    if (!userPredefinedGoalId || !token || !userId) return;
    try {
      const resp = await api(`/api/users/${userId}/predefined-goals/${userPredefinedGoalId}/progress`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      const totalTasks = Number(resp?.totalTasks ?? resp?.total_tasks ?? 0);
      const doneTasks = Number(resp?.doneTasks ?? resp?.done_tasks ?? 0);
      const totalSkills = Number(resp?.totalSkills ?? resp?.total_skills ?? 0);
      const doneSkills = Number(resp?.doneSkills ?? resp?.done_skills ?? 0);

      setProgressInfo({
        totalTasks,
        doneTasks,
        totalSkills,
        doneSkills,
      });
    } catch (err) {
      console.warn("checkProgress failed", err);
    }
  }, [userPredefinedGoalId, token, userId]);

  useEffect(() => {
    if (userPredefinedGoalId) {
      checkProgress();
    }
  }, [checkProgress, refreshTrigger, columns]);

  function optimisticMove(taskId: string | number, toStatus: string) {
    const prev = columns.map((c) => ({ id: c.id, statusKey: c.statusKey, title: c.title, tasks: [...c.tasks] }));
    let movedTask: any = null;
    const newCols = prev.map((c) => {
      const idx = c.tasks.findIndex((t: any) => String(t.id) === String(taskId));
      if (idx >= 0) movedTask = c.tasks.splice(idx, 1)[0];
      return c;
    });
    if (!movedTask) return { prev, applied: false };

    const targetKey = DEFAULT_COLUMN_ORDER.find((key) => key.toLowerCase() === toStatus.toLowerCase()) ?? toStatus;
    movedTask.status = targetKey;
    const targetIdx = newCols.findIndex((c) => c.statusKey === targetKey);
    if (targetIdx >= 0) newCols[targetIdx].tasks.push(movedTask);
    else newCols.push({ id: `col-${targetKey}`, statusKey: targetKey, title: PRETTY_TITLE[targetKey] ?? targetKey, tasks: [movedTask] });

    setColumns(newCols);
    return { prev, applied: true };
  }

  async function persistMove(taskId: string | number, toStatus: string) {
    if (!token || !userId) {
      setError("Not authenticated");
      return false;
    }
    try {
      await api(`/api/users/${userId}/tasks/${taskId}/move`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: { status: toStatus },
      });
      onAfterAction?.();
      setTimeout(() => checkProgress(), 250);
      return true;
    } catch (err) {
      console.error("Persist move failed:", err);
      return false;
    }
  }

  async function changeStatus(taskId: string | number, toStatus: string) {
    const { prev, applied } = optimisticMove(taskId, toStatus);
    if (!applied) {
      await fetchBoard();
      return;
    }
    const ok = await persistMove(taskId, toStatus);
    if (!ok) {
      setColumns(prev);
      setError("Failed to move task on server. Reverting.");
    }
  }

  function onDragStart(ev: React.DragEvent, taskId: string | number) {
    ev.dataTransfer.setData("text/plain", String(taskId));
    if (ev.currentTarget) ev.currentTarget.classList.add("opacity-40");
  }
  function onDragEnd(ev: React.DragEvent) {
    if (ev.currentTarget) ev.currentTarget.classList.remove("opacity-40");
  }
  function onDragOver(ev: React.DragEvent) {
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "move";
  }

  async function onDrop(ev: React.DragEvent, columnStatusKey: string) {
    ev.preventDefault();
    const id = ev.dataTransfer.getData("text/plain");
    if (!id) return;
    const { applied } = optimisticMove(id, columnStatusKey);
    if (!applied) {
      await fetchBoard();
      return;
    }
    const ok = await persistMove(id, columnStatusKey);
    if (!ok) await fetchBoard();
  }

  function StatusSelector({ task }: { task: any }) {
    const cur = (task?.status ?? "todo").toLowerCase();
    return (
      <select
        aria-label="Change task status"
        value={cur}
        onChange={(e) => {
          const v = e.target.value;
          if (v === cur) return;
          changeStatus(task.id, v);
        }}
        className="kanban-status-select"
      >
        {DEFAULT_COLUMN_ORDER.map((k) => (
          <option key={k} value={k}>
            {PRETTY_TITLE[k]}
          </option>
        ))}
      </select>
    );
  }

  function KanbanTaskCard({ task }: { task: any }) {
    const isProject = Boolean(task.predefined_project_id != null || (task.metadata && task.metadata.source === "predefined_project"));
    const matchesSelectedProject =
      isProject &&
      selectedProject &&
      (Number(selectedProject.predefined_project_id ?? selectedProject.predefined_project_id) === Number(task.predefined_project_id) ||
        String(selectedProject.predefined_project_id) === String(task.metadata?.sourceId));

    const statusColor = getStatusColor((task.status ?? "todo").toLowerCase());

    const dragProps = isProject
      ? {}
      : {
        draggable: true,
        onDragStart: (e: React.DragEvent) => onDragStart(e, task.id),
        onDragEnd: onDragEnd,
      };

    if (isProject && !matchesSelectedProject && selectedProject) return null;

    return (
      <div {...(dragProps as any)} className={`kanban-task-card ${isProject ? "kanban-task-project" : ""}`}>
        <div className="task-card-header">
          <div className="task-card-title-wrapper">
            <div className="task-card-title">{task.title}</div>
            {isProject && <div className="task-project-badge">Final Project</div>}
          </div>
        </div>

        {task.description && <div className="task-card-description">{task.description}</div>}

        <div className="task-card-footer">
          <div className={`task-status-badge ${statusColor}`}>{PRETTY_TITLE[task.status] ?? task.status}</div>

          {!isProject ? (
            <div className="task-actions">
              <StatusSelector task={task} />
              <button
                onClick={() => {
                  const order = ["todo", "inprogress", "done"];
                  const curIndex = order.indexOf((task.status ?? "todo").toLowerCase());
                  const next = order[Math.min(curIndex + 1, order.length - 1)];
                  changeStatus(task.id, next);
                }}
                className="task-quick-move"
              >
                <Zap className="w-3 h-3" />
              </button>
            </div>
          ) : (
            <div className="task-project-note">Not counted in progress</div>
          )}
        </div>
      </div>
    );
  }

  // compute progress percentage using consistent logic:
  // prefer skills (doneSkills/totalSkills) else fallback to tasks (doneTasks/totalTasks)
  const progressPercentage = (() => {
    if (!progressInfo) return 0;

    const totalSkills = Number(progressInfo.totalSkills ?? 0);
    const doneSkills = Number(progressInfo.doneSkills ?? 0);
    const totalTasks = Number(progressInfo.totalTasks ?? 0);
    const doneTasks = Number(progressInfo.doneTasks ?? 0);

    if (totalSkills > 0) {
      return Math.round((doneTasks / totalSkills) * 100);
    } else if (totalTasks > 0) {
      return Math.round((doneTasks / totalSkills) * 100);
    }
    return 0;
  })();

  const canSelectProjects = true; // we allow selecting at any time (POST will be attempted)
  // BUT: only inject the selected project into the kanban columns when progressPercentage === 100

  const injectSelectedProjectIntoColumns = (cols: Column[]) => {
    // only inject if we have a selectedProject and progress is 100%
    if (!selectedProject || progressPercentage < 100) return cols;

    const syntheticTask = {
      id: `proj-${selectedProject.predefined_project_id}`,
      predefined_project_id: selectedProject.predefined_project_id,
      title: selectedProject.title,
      description: selectedProject.description ?? null,
      status: "todo",
      difficulty: selectedProject.difficulty ?? "beginner",
      metadata: { source: "predefined_project", sourceId: String(selectedProject.predefined_project_id) },
    };

    const cleaned = cols.map((c) => ({
      ...c,
      tasks: c.tasks.filter((t: any) => {
        const isProject = Boolean(t.predefined_project_id != null || (t.metadata && t.metadata.source === "predefined_project"));
        if (!isProject) return true;
        return String(t.predefined_project_id) === String(selectedProject.predefined_project_id) || String(t.metadata?.sourceId) === String(selectedProject.predefined_project_id);
      }),
    }));

    const todoIdx = cleaned.findIndex((c) => c.statusKey === "todo");
    if (todoIdx >= 0) {
      const exists = cleaned[todoIdx].tasks.some((t: any) => String(t.predefined_project_id) === String(selectedProject.predefined_project_id) || String(t.metadata?.sourceId) === String(selectedProject.predefined_project_id) || String(t.id) === String(syntheticTask.id));
      if (!exists) cleaned[todoIdx].tasks.unshift(syntheticTask);
    } else {
      cleaned.unshift({ id: `col-todo`, statusKey: "todo", title: PRETTY_TITLE["todo"], tasks: [syntheticTask] });
    }

    return cleaned;
  };

  useEffect(() => {
    // whenever selectedProject or progress changes, make sure injection reflects the new state
    setColumns((prev) => injectSelectedProjectIntoColumns(prev));
  }, [selectedProject, progressPercentage]);

  useEffect(() => {
    // also ensure we re-inject on refreshTrigger (or whenever board data changes)
    (async () => {
      await Promise.resolve();
      setColumns((prev) => injectSelectedProjectIntoColumns(prev));
    })();
  }, [refreshTrigger]);

  // Handle selecting project (we will POST regardless of current progress)
  const handleSelectProject = async (projectId: number) => {
    try {
      setError(null);
      if (!userId || !token || !userPredefinedGoalId) {
        setError("Not authenticated or missing context.");
        return;
      }

      setSelectingProject(projectId);
      const body = { predefinedProjectId: projectId };
      // ensure your api helper JSON-stringifies the body when Content-Type is JSON.
      const sel = await api(
        `/api/users/${userId}/predefined-goals/${userPredefinedGoalId}/select-project`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body,
        }
      );
      if (!sel.ok) {
        setError(sel.body?.error || sel.body?.message || "Failed to select project");
        return;
      }

      // refresh local selection & board (the project will be injected into columns only when progressPercentage === 100)
      await fetchSelectedProject();
      await fetchBoard();
      onAfterAction?.();

      setError(null);
    } catch (err: any) {
      console.error("handleSelectProject failed", err);
      const msg = err?.message ?? (err?.body && (err.body.error || err.body.message)) ?? "Failed to select project";
      setError(msg);
    } finally {
      setSelectingProject(null);
    }
  };

  const handleRefreshAll = async () => {
    await Promise.allSettled([fetchBoard(), fetchSuggestions(), fetchSelectedProject(), checkProgress()]);
  };

  return (
    <div className="kanban-wrapper">
      {error && (
        <div className="kanban-error-banner">
          <XCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div className="kanban-loading">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span>Loading board...</span>
        </div>
      )}

      {/* Progress Bar at Top */}
      <div className="progress-top-section">
        <div className="progress-header">
          <div className="progress-icon-wrapper">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div className="progress-info">
            <h3 className="progress-title">Your Progress</h3>
            <p className="progress-subtitle">
              {(() => {
                const totalSkills = Number(progressInfo?.totalSkills ?? 0);
                const doneSkills = Number(progressInfo?.doneSkills ?? 0);
                const totalTasks = Number(progressInfo?.totalTasks ?? 0);
                const doneTasks = Number(progressInfo?.doneTasks ?? 0);

                if (totalSkills > 0) return `${doneSkills} of ${totalSkills} skills completed`;
                return `${doneTasks} of ${totalTasks} tasks completed`;
              })()}
            </p>
          </div>
          <div className="progress-percentage">{progressPercentage}%</div>
        </div>

        <div className="progress-bar-container">
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {progressPercentage === 100 && (
          <div className="progress-complete-banner">
            <CheckCircle className="w-5 h-5" />
            <span>100% — Final projects unlocked. Pick one below.</span>
          </div>
        )}
      </div>

      {/* Kanban Board */}
      <div className="kanban-board">
        <div className="kanban-columns">
          {columns.map((col) => (
            <div key={col.id} className="kanban-column" onDragOver={onDragOver} onDrop={(e) => onDrop(e, col.statusKey)}>
              <div className="kanban-column-header">
                <div className="column-header-content">
                  <span className="column-icon">{getColumnIcon(col.statusKey)}</span>
                  <h3 className="column-title">{col.title}</h3>
                </div>
                <div className="column-count">{col.tasks.length}</div>
              </div>

              <div className="kanban-column-body">
                {col.tasks.length > 0 ? col.tasks.map((t: any) => <KanbanTaskCard key={t.id} task={t} />) : (
                  <div className="column-empty-state">
                    <div className="empty-icon">📋</div>
                    <p>No tasks yet</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Projects Section Below Board */}
      <div className="projects-section">
        <div className="projects-header">
          <div className="projects-title-wrapper">
            <Target className="w-6 h-6" />
            <h2 className="projects-title">Final Projects</h2>
            {progressPercentage < 100 && <Lock className="w-5 h-5 text-gray-400" />}
          </div>
          <button
            onClick={handleRefreshAll}
            className="refresh-projects-btn"
            disabled={loadingSuggestions}
          >
            <RefreshCw className={`w-4 h-4 ${loadingSuggestions ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Note: projects are shown to the user to pick from, but the selected project will only be injected into the Kanban
            board when progressPercentage === 100 (see injectSelectedProjectIntoColumns above). */}
        {loadingSuggestions && (
          <div className="projects-loading">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span>Loading projects...</span>
          </div>
        )}

        {!loadingSuggestions && suggestions && suggestions.length > 0 && (
          <div className="projects-grid">
            {suggestions.map((project) => {
              const isSelected = selectedProject &&
                (Number(selectedProject.predefined_project_id) === Number(project.id) ||
                  String(selectedProject.predefined_project_id) === String(project.id));
              const isSelecting = selectingProject === project.id;

              return (
                <div
                  key={project.id}
                  className={`project-card ${isSelected ? 'project-card-selected' : ''} ${isSelecting ? 'project-card-loading' : ''}`}
                  onClick={() => !isSelecting && handleSelectProject(project.id)}
                >
                  {isSelected && (
                    <div className="project-selected-badge">
                      <CheckCircle className="w-4 h-4" />
                      <span>Selected</span>
                    </div>
                  )}

                  <div className="project-card-header">
                    <h3 className="project-card-title">{project.title}</h3>
                    <div className={`project-difficulty ${project.difficulty?.toLowerCase() || 'beginner'}`}>
                      {project.difficulty || 'Beginner'}
                    </div>
                  </div>

                  {project.description && (
                    <p className="project-card-description">{project.description}</p>
                  )}

                  {project.link && (
                    <a
                      href={project.link}
                      target="_blank"
                      rel="noreferrer"
                      className="project-link"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <LinkIcon className="w-4 h-4" />
                      <span>View Details</span>
                    </a>
                  )}

                  {!isSelected && (
                    <button className="project-select-btn" disabled={isSelecting}>
                      {isSelecting ? (
                        <>
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          <span>Selecting...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>Select Project</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {!loadingSuggestions && (!suggestions || suggestions.length === 0) && (
          <div className="projects-empty-state">
            <Target className="w-12 h-12 text-gray-300" />
            <h3>No Projects Available</h3>
            <p>Check back later for final project suggestions</p>
          </div>
        )}
      </div>
    </div>
  );
}
