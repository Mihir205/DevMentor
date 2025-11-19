// app/predefined/[id]/roadmap/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import api from "../../../lib/api";
import { RoadmapItem } from "../../../components/RoadmapItemList"; // adjust import if your path differs
import { Eye, Loader2, AlertTriangle, Calendar, Link as LinkIcon, XCircle } from "lucide-react";

type RawNode = any;

export default function PredefinedRoadmapPreviewPage() {
  const params = useParams();
  const id = params?.id as string | undefined; // predefinedGoalId

  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [previewItem, setPreviewItem] = useState<RoadmapItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Helper for date formatting
  function formatShort(d?: string | null) {
    if (!d) return "";
    try {
      const dt = new Date(d);
      if (isNaN(dt.getTime())) return String(d);
      return dt.toLocaleString(undefined, { month: "short", day: "numeric" });
    } catch {
      return String(d);
    }
  }

  // normalize backend node -> RoadmapItem
  function nodeToItem(n: RawNode, idx: number): RoadmapItem {
    const d = n?.data ?? n?.payload ?? n ?? {};
    const title = d.title ?? d.label ?? d.name ?? n?.label ?? `Item ${idx + 1}`;
    const description = d.description ?? d.desc ?? d.summary ?? n?.description ?? "";
    const start = d.start ?? d.startDate ?? d.from ?? n?.start ?? null;
    const end = d.end ?? d.endDate ?? d.to ?? n?.end ?? null;
    const resources: { label: string; url: string }[] = [];

    if (d.resourceUrl) resources.push({ label: d.resourceLabel ?? "Resource", url: d.resourceUrl });
    if (Array.isArray(d.resources)) {
      d.resources.forEach((r: any) => {
        if (!r) return;
        if (typeof r === "string") resources.push({ label: r, url: r });
        else if (r?.url) resources.push({ label: r?.label ?? r?.title ?? r?.url, url: r.url });
      });
    }
    if (Array.isArray(d.links)) {
      d.links.forEach((l: any) => {
        if (!l) return;
        if (typeof l === "string") resources.push({ label: l, url: l });
        else if (l?.url) resources.push({ label: l?.label ?? l?.title ?? l.url, url: l.url });
      });
    }

    return {
      id: n?.id ?? `${idx}`,
      title,
      description,
      start,
      end,
      resources,
      raw: n,
    };
  }

  // Fetch roadmap nodes (public endpoint)
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api(`/api/predefined-goals/${id}/roadmap`, { method: "GET" });
        const nodes: RawNode[] = res?.nodes ?? res?.data?.nodes ?? res?.items ?? res ?? [];
        const mapped = Array.isArray(nodes) ? nodes.map((n, i) => nodeToItem(n, i)) : [];
        setItems(mapped);
      } catch (err: any) {
        console.error("Failed to load predefined roadmap:", err);
        setItems([]);
        setError(err?.message ?? "Failed to load roadmap.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  return (
    <div className="p-4 md:p-8">
      {/* Header */}
      <header className="mb-8 border-b border-[--color-border] pb-4">
        <h1 className="text-3xl font-extrabold tracking-tight text-[--color-primary] flex items-center">
          <Eye className="w-8 h-8 mr-2 text-[--color-accent]" /> Roadmap Preview
        </h1>
        <p className="text-md text-[--color-foreground] opacity-70 mt-1">
          This is a read-only preview of the goal's structure.
        </p>
      </header>

      {/* Content Area */}
      <div className="mt-4">
        {loading ? (
          <div className="p-6 card-border text-center text-[--color-primary] flex items-center justify-center">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" /> Loading roadmap items...
          </div>
        ) : error ? (
          <div className="p-6 card-border text-center text-red-500 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 mr-2" /> {error}
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 card-border text-center text-[--color-foreground] opacity-70">
            No items found for this roadmap.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {items.map((it) => (
              <div
                key={it.id}
                className="card-border p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-l-4 border-[--color-primary]/50 bg-[--color-card-bg] transition-shadow duration-300"
              >
                {/* Item Details */}
                <div className="flex-1 min-w-0">
                  <div className="text-lg font-bold text-[--color-foreground] mb-1">{it.title}</div>
                  {it.description && <div className="text-sm text-[--color-foreground] opacity-70 line-clamp-2">{it.description}</div>}

                  {/* Dates & Resources */}
                  <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-[--color-foreground] opacity-60">
                    {(it.start || it.end) && (
                      <div className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {it.start && `Start: ${formatShort(it.start)}`}
                        {it.end && ` | End: ${formatShort(it.end)}`}
                      </div>
                    )}
                    {Array.isArray(it.resources) && it.resources.length > 0 && (
                      <div className="flex items-center gap-2">
                        <LinkIcon className="w-3 h-3" />
                        {it.resources.map((r, idx) => (
                          <a key={idx} href={r.url} target="_blank" rel="noreferrer" className="text-[--color-accent] hover:text-[--color-primary] hover:underline transition-colors">
                            {r.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Preview Button */}
                <div className="flex gap-3 flex-shrink-0">
                  <button onClick={() => setPreviewItem(it)} className="flex items-center px-3 py-2 text-sm font-medium rounded-lg border border-[--color-primary] text-[--color-primary] hover:bg-[--color-primary]/20 transition-colors">
                    <Eye className="w-4 h-4 mr-1" /> View Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {previewItem && (
        <div className="fixed inset-0 z-[1600] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div onClick={() => setPreviewItem(null)} className="fixed inset-0 bg-black/70 backdrop-blur-sm" />

          {/* Modal Content */}
          <div className="relative card-border p-6 md:p-8 rounded-xl w-full max-w-2xl shadow-2xl bg-[--color-card-bg] animate-fadeIn">
            <div className="flex justify-between items-start border-b border-[--color-border] pb-3 mb-4">
              <h3 className="text-2xl font-extrabold text-[--color-accent]">{previewItem.title}</h3>
              <button onClick={() => setPreviewItem(null)} className="text-[--color-primary] hover:text-red-500 transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="text-md text-[--color-foreground] opacity-80 mb-4">{previewItem.description}</div>

            {Array.isArray(previewItem.resources) && previewItem.resources.length > 0 && (
              <div className="mt-4 border-t border-[--color-border] pt-4">
                <h4 className="text-sm font-semibold mb-2 text-[--color-primary]">Resources</h4>
                <div className="flex flex-col gap-1">
                  {previewItem.resources.map((r, i) => (
                    <a key={i} href={r.url} target="_blank" rel="noreferrer" className="text-sm flex items-center text-[--color-accent] hover:underline transition-colors">
                      <LinkIcon className="w-3 h-3 mr-2" /> {r.label}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
