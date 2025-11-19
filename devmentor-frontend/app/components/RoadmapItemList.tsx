// components/RoadmapItemsList.tsx
"use client";
import React, { useEffect, useState } from "react";
import { X, Eye, Plus, Link as LinkIcon, Calendar } from "lucide-react";

export type RoadmapItem = {
  id: string | number;
  title: string;
  description?: string;
  start?: string | null;
  end?: string | null;
  resources?: { label: string; url: string }[];
  raw?: any;
  // optional flags that backend/frontend may include to indicate already added
  added?: boolean;
  inKanban?: boolean;
  user_task_id?: number | string;
  userTaskId?: number | string;
};

type Props = {
  items?: RoadmapItem[];
  onClose?: () => void;
  onPreview?: (item: RoadmapItem) => void;
  onAddToKanban?: (item: RoadmapItem) => Promise<any> | any;
  showAddToKanban?: boolean;
  heading?: string;
};

function nowIso() {
  return new Date().toISOString();
}

// Helper function to format date consistently
function formatShort(d?: string | null) {
  if (!d) return "";
  try {
    const dt = new Date(d);
    if (isNaN(dt.getTime())) return String(d);
    return dt.toLocaleString(undefined, { month: "short", day: "numeric" });
  } catch (e) {
    return String(d);
  }
}

export default function RoadmapItemsList({
  items = [],
  onClose,
  onPreview,
  onAddToKanban,
  showAddToKanban = true,
  heading = "Roadmap Items",
}: Props) {
  // Track which items have already been added to Kanban (by item.id string)
  const [addedSet, setAddedSet] = useState<Set<string | number>>(new Set());
  const [logs, setLogs] = useState<string[]>([]);
  const [busyMap, setBusyMap] = useState<Record<string, boolean>>({});

  // derive whether an item is already added based on many possible shapes
  function detectAlreadyAdded(it: RoadmapItem) {
    // explicit flags
    if (it.added === true || it.inKanban === true) return true;

    // presence of user task id(s)
    if (it.user_task_id || it.userTaskId) return true;

    // nested shapes: it.raw.user_task_id or it.raw.userTaskId or it.raw.user_task?.id
    if (it.raw) {
      if (it.raw.user_task_id || it.raw.userTaskId) return true;
      if (it.raw.user_task && (it.raw.user_task.id || it.raw.user_task._id)) return true;
      if (it.raw.user_predefined_goal_task_id) return true;
    }

    // sometimes backend returns `task` or `createdTask` in the item
    if ((it as any).task || (it as any).createdTask || (it as any).userTask) return true;

    return false;
  }

  // initialize addedSet from incoming items
  useEffect(() => {
    const s = new Set<string | number>();
    for (const it of items || []) {
      if (detectAlreadyAdded(it)) s.add(String(it.id));
    }
    setAddedSet(s);
  }, [items]);

  // helper to push a log entry
  function pushLog(msg: string) {
    setLogs((prev) => {
      const next = [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev];
      return next.slice(0, 30); // keep last 30 logs
    });
  }

  // Handle add-to-kanban click
  async function handleAdd(item: RoadmapItem) {
    const key = String(item.id);
    if (addedSet.has(key)) {
      pushLog(`Item ${key} already added — skipping.`);
      return;
    }

    // optimistic update
    setAddedSet((prev) => {
      const n = new Set(prev);
      n.add(key);
      return n;
    });
    setBusyMap((m) => ({ ...m, [key]: true }));
    pushLog(`Adding item ${key} ("${item.title}") to Kanban...`);

    try {
      const result = await onAddToKanban?.(item);

      // If result suggests failure, handle gracefully
      // Accept various shapes: { ok: false, error }, thrown error, or success object
      if (result && result.ok === false) {
        // treat as failure
        const errMsg = result.error ?? "server rejected add";
        pushLog(`Failed to add ${key}: ${errMsg}`);
        // revert optimistic
        setAddedSet((prev) => {
          const n = new Set(prev);
          n.delete(key);
          return n;
        });
      } else {
        // success: enrich log with returned identifier if present
        let detail = "";
        if (result && (result.id || result._id || result.user_task_id || result.createdTask?.id)) {
          const returnedId = result.id ?? result._id ?? result.user_task_id ?? result.createdTask?.id;
          detail = ` (created task ${returnedId})`;
        } else if (result && typeof result === "object") {
          // maybe result has nested shape userPredefinedGoal or userTask
          if (result.userTask || result.user_task) {
            const rt = result.userTask ?? result.user_task;
            detail = ` (created task ${rt.id ?? rt._id ?? "?"})`;
          }
        }
        pushLog(`Added ${key} "${item.title}" to Kanban${detail}.`);
        // Keep optimistic add (don't revert)
      }
    } catch (err: any) {
      // revert optimistic update on error
      setAddedSet((prev) => {
        const n = new Set(prev);
        n.delete(key);
        return n;
      });
      const em = err?.message ?? "Add failed";
      pushLog(`Error adding ${key}: ${em}`);
    } finally {
      setBusyMap((m) => {
        const n = { ...m };
        delete n[key];
        return n;
      });
    }
  }

  const count = Array.isArray(items) ? items.length : 0;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1000] cursor-pointer"
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[1010] flex items-start justify-center p-4 sm:p-10 pointer-events-none">
        <div
          role="dialog"
          aria-modal="true"
          className="w-full max-w-4xl max-h-[84vh] overflow-auto card-border p-6 sm:p-8 rounded-xl shadow-2xl bg-[--color-card-bg] pointer-events-auto"
        >
          {/* Header */}
          <div className="flex justify-between items-center gap-4 border-b border-[--color-border] pb-4 mb-4">
            <div>
              <h2 className="text-2xl font-extrabold text-[--color-primary]">
                {heading}
              </h2>
              <div className="text-sm text-[--color-foreground] opacity-70 mt-1">{count} items found</div>
            </div>

            <button
              onClick={onClose}
              className="flex items-center px-4 py-2 text-sm font-semibold rounded-lg bg-[--color-primary] text-white hover:bg-[--color-accent] hover:text-black transition-colors"
            >
              <X className="w-4 h-4 mr-1" /> Close
            </button>
          </div>

          {/* Items */}
          <div className="flex flex-col gap-3">
            {count === 0 && (
              <div className="text-center opacity-60 p-8 border border-dashed border-[--color-border] rounded-lg">
                No items found for this roadmap.
              </div>
            )}

            {items.map((it) => {
              const key = String(it.id);
              // treat as added if either in addedSet or detectAlreadyAdded
              const alreadyAdded =
                addedSet.has(key) || detectAlreadyAdded(it);

              const busy = Boolean(busyMap[key]);

              return (
                <div
                  key={key}
                  className="flex flex-col sm:flex-row gap-4 items-start p-4 rounded-xl border border-[--color-border] bg-[--color-background]/50 hover:bg-[--color-background] transition"
                >
                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-bold text-[--color-accent]">{it.title}</div>
                    {it.description && (
                      <div className="mt-1 text-sm opacity-80 line-clamp-2">{it.description}</div>
                    )}

                    {(it.start || it.end) && (
                      <div className="mt-2 flex items-center text-xs opacity-60">
                        <Calendar className="w-3 h-3 mr-1" />
                        {it.start ? `Starts: ${formatShort(it.start)}` : ""}
                        {it.end ? ` | Ends: ${formatShort(it.end)}` : ""}
                      </div>
                    )}

                    {Array.isArray(it.resources) && it.resources.length > 0 && (
                      <div className="mt-3 flex gap-3 flex-wrap">
                        {it.resources.map((r, idx) => (
                          <a
                            key={idx}
                            href={r.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center text-xs font-mono text-[--color-primary] hover:text-[--color-accent] hover:underline"
                          >
                            <LinkIcon className="w-3 h-3 mr-1" /> {r.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0 flex gap-3 mt-2 sm:mt-0">
                    <button
                      onClick={() => onPreview?.(it)}
                      className="flex items-center px-3 py-2 text-sm font-medium rounded-lg border border-[--color-primary] text-[--color-primary] hover:bg-[--color-primary] hover:text-white transition"
                    >
                      <Eye className="w-4 h-4 mr-1" /> Preview
                    </button>

                    {showAddToKanban && !alreadyAdded && (
                      <button
                        onClick={() => handleAdd(it)}
                        disabled={busy}
                        className={`flex items-center px-3 py-2 text-sm font-semibold rounded-lg ${busy ? "bg-[--color-border] text-[--color-foreground] cursor-not-allowed" : "bg-[--color-accent] border border-[--color-accent] text-black hover:bg-[--color-primary] hover:text-white"} transition`}
                      >
                        {busy ? "Adding..." : (<><Plus className="w-4 h-4 mr-1" /> Add to Kanban</>)}
                      </button>
                    )}

                    {alreadyAdded && (
                      <div className="px-3 py-2 text-sm font-semibold rounded-lg bg-green-600/20 text-green-500 border border-green-600/40">
                        Added ✓
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Logs */}
          <div className="mt-6 border-t pt-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-medium">Activity log</div>
              <div className="text-xs opacity-60">{logs.length} entries</div>
            </div>

            {logs.length === 0 ? (
              <div className="text-xs opacity-60 p-3 bg-[--color-card-bg] rounded">No actions yet.</div>
            ) : (
              <div className="max-h-40 overflow-auto text-xs font-mono bg-[--color-card-bg] p-2 rounded space-y-1">
                {logs.map((l, i) => (
                  <div key={i} className="text-[12px] opacity-80">{l}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
