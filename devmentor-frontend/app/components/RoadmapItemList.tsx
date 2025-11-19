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
  /**
   * NEW: array of existing tasks currently in the Kanban board.
   * Passing this allows the component to detect "already added" items reliably.
   * Example value: columns.flatMap(c => c.tasks)
   */
  existingTasks?: any[] | null;
};

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

/**
 * RoadmapItemsList
 * - Adds `existingTasks` prop to detect tasks already in Kanban.
 * - Uses multiple heuristics to match items -> existing tasks:
 *    • id match (if roadmap item stores `user_task_id` or similar)
 *    • same title (loose)
 *    • matching predefined_skill_id / skill id / source metadata
 * - Keeps optimistic add behaviour and reverts on failure.
 */
export default function RoadmapItemsList({
  items = [],
  onClose,
  onPreview,
  onAddToKanban,
  showAddToKanban = true,
  heading = "Roadmap Items",
  existingTasks = null,
}: Props) {
  const [addedSet, setAddedSet] = useState<Set<string | number>>(new Set());
  const [logs, setLogs] = useState<string[]>([]);
  const [busyMap, setBusyMap] = useState<Record<string, boolean>>({});

  // Helper to append log entries
  function pushLog(msg: string) {
    setLogs(prev => {
      const next = [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev];
      return next.slice(0, 40);
    });
  }

  // Detect if a roadmap item is already added (based on many shapes)
  function detectAlreadyAddedLocal(it: RoadmapItem, existing: any[] | null) {
    // 1) explicit flags in roadmap item
    if (it.added === true || it.inKanban === true) return true;
    if (it.user_task_id || it.userTaskId) return true;

    // 2) inside raw field
    if (it.raw) {
      if (it.raw.user_task_id || it.raw.userTaskId) return true;
      if (it.raw.user_task && (it.raw.user_task.id || it.raw.user_task._id)) return true;
    }

    // 3) try to match against existingTasks passed from Kanban
    if (Array.isArray(existing) && existing.length > 0) {
      // canonicalize item keys for comparison
      const itemIdStr = it.id != null ? String(it.id) : null;
      const itemTitle = (it.title || "").trim().toLowerCase();

      // also try to detect skill id / source ids from roadmap item (common fields)
      const itemSkillId = (it as any).skill_id ?? (it as any).predefined_skill_id ?? (it.raw && (it.raw.skill_id ?? it.raw.predefined_skill_id));

      for (const t of existing) {
        if (!t) continue;
        // many possible id fields in existing kanban task
        const candidates = [
          t.id,
          t._id,
          t.user_task_id,
          t.userTaskId,
          t.user_task?.id,
          t.userTask?.id,
          t.predefined_task_id,
          t.predefined_skill_id,
          t.skill_id,
          t.predefined_project_id,
          t.metadata?.sourceId,
          t.metadata?.source_id,
        ].filter(Boolean);

        // id exact match if roadmap item carried a created task id
        if (itemIdStr && candidates.some(c => String(c) === itemIdStr)) return true;

        // title match (loose, case-insensitive)
        if (typeof t.title === "string" && itemTitle && t.title.trim().toLowerCase() === itemTitle) return true;

        // skill/predefined id match
        const candSkillIds = [
          t.skill_id,
          t.predefined_skill_id,
          t.predefined_task_id,
          t.metadata?.skillId,
          t.metadata?.sourceId,
        ].filter(Boolean);

        if (itemSkillId != null && candSkillIds.some(c => String(c) === String(itemSkillId))) return true;

        // sometimes task metadata includes reference to roadmap item id
        if (it.raw && typeof it.raw === "object") {
          const rawRef = it.raw.reference_id ?? it.raw.refId ?? it.raw.sourceId;
          if (rawRef && candidates.some(c => String(c) === String(rawRef))) return true;
        }
      }
    }

    // Not found
    return false;
  }

  // Initialize addedSet from incoming items and existingTasks
  useEffect(() => {
    // seed from items that carry their own added flags
    const s = new Set<string | number>();
    for (const it of items || []) {
      // if item explicitly indicates it's added, mark it
      if (it.added === true || it.inKanban === true) s.add(String(it.id));
      if (it.user_task_id || it.userTaskId) s.add(String(it.id));
    }

    // also scan existingTasks to mark corresponding roadmap items as added
    if (Array.isArray(existingTasks) && existingTasks.length > 0) {
      for (const it of items || []) {
        if (detectAlreadyAddedLocal(it, existingTasks)) s.add(String(it.id));
      }
    }

    setAddedSet(s);
  }, [items, existingTasks]);

  // Handle adding an item
  async function handleAdd(item: RoadmapItem) {
    const key = String(item.id);
    if (addedSet.has(key)) {
      pushLog(`Item ${key} already marked added — skipping.`);
      return;
    }

    // optimistic
    setAddedSet(prev => new Set(prev).add(key));
    setBusyMap(m => ({ ...m, [key]: true }));
    pushLog(`Adding ${key} "${item.title}" to Kanban…`);

    try {
      const result = await onAddToKanban?.(item);

      if (result && result.ok === false) {
        // server rejected
        pushLog(`Server rejected add: ${String(result.error ?? "unknown")}`);
        // revert optimistic
        setAddedSet(prev => {
          const n = new Set(prev);
          n.delete(key);
          return n;
        });
      } else {
        // success: keep added state; optionally log returned id
        let detail = "";
        if (result && (result.id || result._id || result.user_task_id || result.createdTask?.id)) {
          const returnedId = result.id ?? result._id ?? result.user_task_id ?? result.createdTask?.id;
          detail = ` (created task ${returnedId})`;
        }
        pushLog(`Added ${key}${detail}`);
      }
    } catch (err: any) {
      pushLog(`Error adding ${key}: ${err?.message ?? String(err)}`);
      setAddedSet(prev => {
        const n = new Set(prev);
        n.delete(key);
        return n;
      });
    } finally {
      setBusyMap(m => {
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
          <div className="flex justify-between items-center gap-4 border-b border-[--color-border] pb-4 mb-4">
            <div>
              <h2 className="text-2xl font-extrabold text-[--color-primary]">{heading}</h2>
              <div className="text-sm text-[--color-foreground] opacity-70 mt-1">{count} items found</div>
            </div>

            <button
              onClick={onClose}
              className="flex items-center px-4 py-2 text-sm font-semibold rounded-lg bg-[--color-primary] text-white hover:bg-[--color-accent] hover:text-black transition-colors"
            >
              <X className="w-4 h-4 mr-1" /> Close
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {count === 0 && (
              <div className="text-center opacity-60 p-8 border border-dashed border-[--color-border] rounded-lg">
                No items found for this roadmap.
              </div>
            )}

            {items.map(it => {
              const key = String(it.id);
              const busy = Boolean(busyMap[key]);

              // final check to decide if Add should be shown:
              const alreadyAdded = addedSet.has(key) || detectAlreadyAddedLocal(it, existingTasks);

              return (
                <div key={key} className="flex flex-col sm:flex-row gap-4 items-start p-4 rounded-xl border border-[--color-border] bg-[--color-background]/50 hover:bg-[--color-background] transition">
                  <div className="flex-1 min-w-0">
                    <div className="text-lg font-bold text-[--color-accent]">{it.title}</div>
                    {it.description && <div className="mt-1 text-sm opacity-80 line-clamp-2">{it.description}</div>}

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
                          <a key={idx} href={r.url} target="_blank" rel="noreferrer" className="flex items-center text-xs font-mono text-[--color-primary] hover:text-[--color-accent] hover:underline">
                            <LinkIcon className="w-3 h-3 mr-1" /> {r.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

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
                {logs.map((l, i) => <div key={i} className="text-[12px] opacity-80">{l}</div>)}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
