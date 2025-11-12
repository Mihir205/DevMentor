// components/KanbanBoardWrapper.tsx
"use client";
import React, { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { getAuth } from "../lib/auth";
import { RefreshCw, Zap, XCircle } from "lucide-react";

type TaskRow = any;
type Column = { id: string | number; title: string; statusKey: string; tasks: TaskRow[] };

const DEFAULT_COLUMN_ORDER = ["todo", "inprogress", "done", "blocked"];
const PRETTY_TITLE: Record<string, string> = {
  todo: "To Do",
  inprogress: "In Progress",
  done: "Done",
  blocked: "Blocked",
};

// Helper function to map status key to a color class for the techy badge look
const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
        case 'done': return 'text-green-500 bg-green-500/10 border-green-500/30';
        case 'inprogress': return 'text-[--color-primary] bg-[--color-primary]/10 border-[--color-primary]/30';
        case 'blocked': return 'text-red-500 bg-red-500/10 border-red-500/30';
        default: return 'text-gray-500 bg-gray-500/10 border-gray-500/30'; // todo
    }
};

export default function KanbanBoardWrapper({ userPredefinedGoalId }: { userPredefinedGoalId?: string | string[] }) {
  const [columns, setColumns] = useState<Column[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token, user } = getAuth();

  // stable primitive userId
  const userId = user ? ((user as any).id ?? (user as any)._id ?? null) : null;

  const fetchBoard = useCallback(async () => {
    if (!userPredefinedGoalId || !token || !userId) {
      setColumns([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const endpoint = `/api/users/${userId}/predefined-goals/${userPredefinedGoalId}/kanban`;
      const resp = await api(endpoint, { method: "GET", headers: { Authorization: `Bearer ${token}` } });
      const kb = resp?.kanban ?? resp?.data?.kanban ?? resp ?? {};
      
      const baseCols: Column[] = DEFAULT_COLUMN_ORDER.map(k => ({
        id: `col-${k}`,
        statusKey: k,
        title: PRETTY_TITLE[k] ?? (k[0].toUpperCase() + k.slice(1)),
        tasks: Array.isArray(kb[k]) ? kb[k] : [],
      }));

      // include any extra server keys (non-destructive)
      const extraKeys = Object.keys(kb || {}).filter(k => !DEFAULT_COLUMN_ORDER.includes(k));
      for (const k of extraKeys) {
        baseCols.push({ 
            id: `col-${k}`, 
            statusKey: k,
            title: PRETTY_TITLE[k] ?? (k[0].toUpperCase() + k.slice(1)), 
            tasks: Array.isArray(kb[k]) ? kb[k] : [] 
        });
      }

      setColumns(baseCols.map(c => ({ id: c.id, statusKey: c.statusKey, title: c.title, tasks: c.tasks })));
    } catch (err: any) {
      console.error("Kanban fetch error:", err);
      setError(err?.message ?? "Failed to fetch kanban board");
      setColumns([]);
    } finally {
      setLoading(false);
    }
  }, [userPredefinedGoalId, token, userId]);

  useEffect(() => { fetchBoard(); }, [fetchBoard]);

  // Helper: optimistic UI update for a task move (returns previous state so we can revert if needed)
  function optimisticMove(taskId: string | number, toStatus: string) {
    const prev = columns.map(c => ({ id: c.id, statusKey: c.statusKey, title: c.title, tasks: [...c.tasks] }));
    let movedTask: any = null;
    const newCols = prev.map(c => {
      const idx = c.tasks.findIndex((t: any) => String(t.id) === String(taskId));
      if (idx >= 0) {
        movedTask = c.tasks.splice(idx, 1)[0];
      }
      return c;
    });
    if (!movedTask) return { prev, applied: false };
    
    // Convert target status to key (e.g., 'To Do' -> 'todo')
    const targetStatusKey = DEFAULT_COLUMN_ORDER.find(key => key.toLowerCase() === toStatus.toLowerCase() || PRETTY_TITLE[key].toLowerCase() === toStatus.toLowerCase()) || toStatus;

    movedTask.status = targetStatusKey;
    const targetIdx = newCols.findIndex(c => c.statusKey === targetStatusKey);

    if (targetIdx >= 0) newCols[targetIdx].tasks.push(movedTask);
    else {
      // Fallback: If status is new, create a new column (should rarely happen)
      const created = { id: `col-${targetStatusKey}`, statusKey: targetStatusKey, title: PRETTY_TITLE[targetStatusKey] ?? targetStatusKey, tasks: [movedTask] };
      newCols.push(created);
    }
    setColumns(newCols);
    return { prev, applied: true };
  }

  async function persistMove(taskId: string | number, toStatus: string) {
    if (!token || !userId) { setError("Not authenticated"); return false; }
    try {
      await api(`/api/users/${userId}/tasks/${taskId}/move`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` },
        body: { status: toStatus },
      });
      return true;
    } catch (err) {
      console.error("Persist move failed:", err);
      return false;
    }
  }

  async function changeStatus(taskId: string | number, toStatus: string) {
    const { prev, applied } = optimisticMove(taskId, toStatus);
    if (!applied) { await fetchBoard(); return; }

    const ok = await persistMove(taskId, toStatus);
    if (!ok) {
      setColumns(prev);
      setError("Failed to move task on server. Reverting.");
      // NOTE: Using setError state instead of alert() for professional UI feedback
    }
  }

  // drag & drop handlers
  function onDragStart(ev: React.DragEvent, taskId: string | number) {
    ev.dataTransfer.setData("text/plain", String(taskId));
    // Added a class to the element being dragged for visual feedback
    if (ev.currentTarget) ev.currentTarget.classList.add('opacity-40');
    ev.dataTransfer.effectAllowed = "move";
  }
  function onDragEnd(ev: React.DragEvent) {
    if (ev.currentTarget) ev.currentTarget.classList.remove('opacity-40');
  }
  function onDragOver(ev: React.DragEvent) { ev.preventDefault(); ev.dataTransfer.dropEffect = "move"; }
  
  async function onDrop(ev: React.DragEvent, columnStatusKey: string) {
    ev.preventDefault();
    const id = ev.dataTransfer.getData("text/plain");
    if (!id) return;

    // Use the status key directly from the column object (e.g., 'todo', 'inprogress')
    const targetKey = columnStatusKey; 
    
    const { applied } = optimisticMove(id, targetKey);
    if (!applied) { await fetchBoard(); return; }
    
    const ok = await persistMove(id, targetKey);
    if (!ok) await fetchBoard(); // Re-fetch on server failure
  }

  // UI: per-card status dropdown
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
        // Techy, focused select styling
        className="px-2 py-1 text-xs rounded-lg border border-[--color-border] bg-[--color-card-bg] text-[--color-foreground] focus:ring-1 focus:ring-[--color-accent] focus:border-[--color-accent] transition-all cursor-pointer"
      >
        {DEFAULT_COLUMN_ORDER.map(k => (
            <option key={k} value={k}>{PRETTY_TITLE[k]}</option>
        ))}
      </select>
    );
  }
  
  // UI: Kanban Task Card
  function KanbanTaskCard({ task }: { task: any }) {
    const statusColor = getStatusColor((task.status ?? "todo").toLowerCase());
    return (
        <div
            key={task.id}
            draggable
            onDragStart={(e) => onDragStart(e, task.id)}
            onDragEnd={onDragEnd}
            className={`
                card-border p-4 bg-[--color-card-bg] shadow-md hover:shadow-lg transition-all 
                duration-200 cursor-grab active:cursor-grabbing hover:ring-2 hover:ring-[--color-accent]/50
            `}
        >
            <div className="flex justify-between items-start gap-3">
                
                {/* Task Content */}
                <div className="flex-1">
                    <div className="font-bold text-[--color-foreground] mb-1">{task.title}</div>
                    {task.description && (
                        <div className="text-xs text-[--color-foreground] opacity-70 mb-2">{task.description}</div>
                    )}
                </div>

                {/* Status/Actions */}
                <div className="flex flex-col gap-2 items-end">
                    
                    {/* Status Badge */}
                    <div className={`text-xs font-semibold py-0.5 px-2 rounded-full border ${statusColor}`}>
                        {PRETTY_TITLE[task.status] || task.status}
                    </div>

                    {/* Status Selector Dropdown */}
                    <StatusSelector task={task} />
                    
                    {/* Quick Move Button */}
                    <button
                        onClick={() => {
                            const order = ["todo", "inprogress", "done", "blocked"];
                            const curIndex = order.indexOf((task.status ?? "todo").toLowerCase());
                            const next = order[Math.min(curIndex + 1, order.length - 1)];
                            changeStatus(task.id, next);
                        }}
                        className="flex items-center text-xs font-medium text-[--color-primary] hover:text-[--color-accent] transition-colors"
                    >
                        <Zap className="w-3 h-3 mr-1" /> Quick Move
                    </button>
                </div>
            </div>
            {/* Techy ID Display */}
            <div className="mt-3 text-[10px] text-[--color-foreground] opacity-50 font-mono">ID: {String(task.id)}</div>
        </div>
    );
  }

  return (
    <div className="mt-4">
        {/* Error/Loading Feedback */}
        <div className="mb-4">
            {loading && <div className="flex items-center text-[--color-primary] font-medium"><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Loading Kanban Board...</div>}
            {error && <div className="flex items-center text-red-500 font-medium bg-red-500/10 border border-red-500 p-3 rounded-lg"><XCircle className="w-4 h-4 mr-2" /> {error}</div>}
        </div>

      <div className="flex gap-4 items-start overflow-x-auto pb-4">
        {columns.map(col => (
          <div 
            key={col.id} 
            // Standard column width for professional Kanban look (min-w-80 = 320px)
            className="min-w-80 flex-shrink-0 w-80 bg-[--color-card-bg] rounded-xl p-4 shadow-xl"
            onDragOver={onDragOver} 
            // Use the statusKey for the drop target
            onDrop={(e) => onDrop(e, col.statusKey)}
          >
            {/* Column Header */}
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-[--color-border]">
              <div className={`text-xl font-extrabold text-[--color-primary] tracking-tight`}>
                {col.title}
              </div>
              <div className="text-sm font-semibold py-1 px-3 rounded-full text-[--color-foreground] opacity-70 bg-[--color-border]">{col.tasks.length}</div>
            </div>

            {/* Task Container (Drop Zone) */}
            <div className="min-h-[100px] flex flex-col gap-3">
              {col.tasks.map((t: any) => (
                <KanbanTaskCard key={t.id} task={t} />
              ))}

              {col.tasks.length === 0 && (
                <div className="text-[--color-foreground] opacity-50 p-4 border border-dashed border-[--color-border] rounded-lg text-center text-sm">
                  Drag tasks here or use the quick add button.
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}