"use client";
import React, { useState } from "react";
import { X, Eye, Plus, Link as LinkIcon, Calendar } from "lucide-react";

export type RoadmapItem = {
  id: string | number;
  title: string;
  description?: string;
  start?: string | null;
  end?: string | null;
  resources?: { label: string; url: string }[];
  raw?: any;
};

type Props = {
  items?: RoadmapItem[];
  onClose?: () => void;
  onPreview?: (item: RoadmapItem) => void;
  onAddToKanban?: (item: RoadmapItem) => Promise<void> | void;
  showAddToKanban?: boolean;
  heading?: string;
};

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

  // Track which items have already been added to Kanban
  const [addedSet, setAddedSet] = useState<Set<string | number>>(new Set());

  // Handle add-to-kanban click
  async function handleAdd(item: RoadmapItem) {
    // Optimistic update: mark as added immediately
    setAddedSet(prev => new Set(prev).add(item.id));

    // Execute callback safely
    try {
      await onAddToKanban?.(item);
    } catch (err) {
      // If API fails, revert optimistic update
      const newSet = new Set(addedSet);
      newSet.delete(item.id);
      setAddedSet(newSet);
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
              const alreadyAdded = addedSet.has(it.id);

              return (
                <div
                  key={it.id}
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
                        className="flex items-center px-3 py-2 text-sm font-semibold rounded-lg bg-[--color-accent] border border-[--color-accent] text-black hover:bg-[--color-primary] hover:text-white transition"
                      >
                        <Plus className="w-4 h-4 mr-1" /> Add to Kanban
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
        </div>
      </div>
    </>
  );
}
