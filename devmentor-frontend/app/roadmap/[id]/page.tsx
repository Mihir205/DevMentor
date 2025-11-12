// app/roadmap/[id]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "../../lib/api";
import { getAuth } from "../../lib/auth";
import RoadmapItemsList, { RoadmapItem } from "../../components/RoadmapItemList";

type RawNode = any;

export default function UserRoadmapPage() {
  const params = useParams();
  const id = params?.id as string | number | undefined; // userPredefinedGoalId
  const router = useRouter();
  const { token, user } = getAuth();

  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [previewItem, setPreviewItem] = useState<RoadmapItem | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | number | null>(null);

  // normalize backend node -> RoadmapItem
  function nodeToItem(n: RawNode, idx: number): RoadmapItem {
    const d = n?.data ?? n?.payload ?? n ?? {};
    const title = d.title ?? d.label ?? d.name ?? n?.label ?? `Task ${idx + 1}`;
    const description = d.description ?? d.desc ?? d.summary ?? n?.description ?? "";
    const start = d.start ?? d.startDate ?? d.from ?? n?.start ?? null;
    const end = d.end ?? d.endDate ?? d.to ?? n?.end ?? null;
    const resources: { label: string; url: string }[] = [];

    // common resource shapes
    if (d.resourceUrl) resources.push({ label: d.resourceLabel ?? "Resource", url: d.resourceUrl });
    if (Array.isArray(d.resources)) {
      d.resources.forEach((r: any) => {
        if (!r) return;
        if (typeof r === "string") resources.push({ label: r, url: r });
        else if (r?.url) resources.push({ label: r?.label ?? r?.title ?? r?.url, url: r.url });
      });
    }
    // some nodes might include links in d.links or d.urls
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

  // fetch
  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        if (!token || !user) {
          // require login
          router.push("/auth/login");
          return;
        }
        const userId = user.id ?? user._id;
        const res = await api(`/api/users/${userId}/predefined-goals/${id}/roadmap`, {
          method: "GET",
          headers: { Authorization: `Bearer ${token}` },
        });
        const nodes: RawNode[] = res?.nodes ?? res?.data?.nodes ?? res?.items ?? res ?? [];
        const mapped = Array.isArray(nodes) ? nodes.map((n, i) => nodeToItem(n, i)) : [];
        setItems(mapped);
      } catch (err: any) {
        console.error("Failed to load roadmap items:", err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, token]);

  // add single item to kanban
  async function addSingleToKanban(item: RoadmapItem) {
    if (!token || !user) {
      router.push("/auth/login");
      return;
    }
    const userId = user.id ?? user._id;
    const payload = {
      title: item.title,
      description: item.description ?? "",
      start: item.start ?? null,
      end: item.end ?? null,
      metadata: { source: "roadmap", sourceId: item.id },
    };

    try {
      setBusyItemId(item.id);
      await api(`/api/users/${userId}/predefined-goals/${id}/kanban/tasks`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: payload,
      });
      // small success feedback
      // eslint-disable-next-line no-alert
      alert("Added to Kanban");
    } catch (e: any) {
      console.error("Failed to add to kanban:", e);
      // eslint-disable-next-line no-alert
      alert(e?.message || "Failed to add to Kanban");
    } finally {
      setBusyItemId(null);
    }
  }

  // add all items (whole roadmap) to kanban
  async function addAllToKanban() {
    if (!token || !user) {
      router.push("/auth/login");
      return;
    }
    const userId = user.id ?? user._id;
    try {
      // try bulk pattern first (adjust if your API differs)
      const payload = { tasks: items.map(it => ({ title: it.title, description: it.description, start: it.start, end: it.end, metadata: { source: "roadmap", sourceId: it.id } })) };
      await api(`/api/users/${userId}/predefined-goals/${id}/kanban/tasks`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: payload,
      });
      alert("All roadmap items added to Kanban");
      router.push(`/kanban/${id}`);
    } catch (bulkErr) {
      console.warn("Bulk add failed, falling back to per-item add", bulkErr);
      // fallback
      for (const it of items) {
        // eslint-disable-next-line no-await-in-loop
        await addSingleToKanban(it);
      }
      router.push(`/kanban/${id}`);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h1>Your Roadmap</h1>
      <p style={{ color: "#6f7a89" }}>All resources for this roadmap are listed below. Use Preview to view details or Add to Kanban to push to your board.</p>

      <div style={{ marginTop: 18 }}>
        {loading ? (
          <div style={{ color: "#9aa4b6" }}>Loading items…</div>
        ) : items.length === 0 ? (
          <div style={{ color: "#9aa4b6" }}>No items found for this roadmap.</div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 12 }}>
              <button onClick={() => router.push(`/kanban/${id}`)} style={plainBtn}>Open Kanban</button>
              <button onClick={addAllToKanban} style={addAllBtn}>Add all to Kanban</button>
            </div>

            {/* Inline full-width list (uses same item layout as RoadmapItemsList) */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {items.map((it) => (
                <div key={it.id} style={{
                  display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start",
                  padding: 14, borderRadius: 10, background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.02)"
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#eaf2ff" }}>{it.title}</div>
                    {it.description && <div style={{ marginTop: 6, color: "#9fb0c6" }}>{it.description}</div>}
                    {(it.start || it.end) && (
                      <div style={{ marginTop: 8, color: "#7f8b98", fontSize: 13 }}>
                        {it.start ? `${new Date(it.start).toLocaleString(undefined, { month: "short", day: "numeric" })} ` : ""}{it.end ? `• ${new Date(it.end).toLocaleString(undefined, { month: "short", day: "numeric" })}` : ""}
                      </div>
                    )}
                    {Array.isArray(it.resources) && it.resources.length > 0 && (
                      <div style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {it.resources.map((r, idx) => (
                          <a key={idx} href={r.url} target="_blank" rel="noreferrer" style={{ color: "#7fb0ff", fontSize: 13 }}>
                            {r.label}
                          </a>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => setPreviewItem(it)} style={previewBtn}>Preview</button>
                    <button onClick={() => addSingleToKanban(it)} style={addBtn} disabled={busyItemId === it.id}>
                      {busyItemId === it.id ? "Adding…" : "Add to Kanban"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Preview modal (simple) */}
      {previewItem && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1600, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "#07101a", padding: 18, borderRadius: 10, width: "min(720px, 96%)", boxShadow: "0 12px 40px rgba(0,0,0,0.7)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>{previewItem.title}</h3>
              <button onClick={() => setPreviewItem(null)} style={closeBtn}>Close</button>
            </div>
            <div style={{ marginTop: 12, color: "#bcd0e6" }}>{previewItem.description}</div>
            {Array.isArray(previewItem.resources) && previewItem.resources.length > 0 && (
              <div style={{ marginTop: 12 }}>
                {previewItem.resources.map((r, i) => <div key={i}><a href={r.url} target="_blank" rel="noreferrer" style={{ color: "#7fb0ff" }}>{r.label}</a></div>)}
              </div>
            )}
          </div>
          <div onClick={() => setPreviewItem(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)" }} />
        </div>
      )}
    </div>
  );
}

/* simple button styles */
const previewBtn: React.CSSProperties = { padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)", background: "transparent", color: "#9fbfff", cursor: "pointer", fontWeight: 700 };
const addBtn: React.CSSProperties = { padding: "8px 12px", borderRadius: 8, border: "none", background: "#24a57a", color: "#fff", cursor: "pointer", fontWeight: 700 };
const addAllBtn: React.CSSProperties = { padding: "8px 14px", borderRadius: 8, border: "none", background: "#1f8bff", color: "#fff", cursor: "pointer", fontWeight: 800 };
const plainBtn: React.CSSProperties = { padding: "8px 12px", borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)", background: "transparent", color: "#cfe3ff", cursor: "pointer" };
const closeBtn: React.CSSProperties = { padding: "8px 12px", borderRadius: 8, background: "#2b6cff", color: "#fff", border: "none", fontWeight: 700, cursor: "pointer" };
