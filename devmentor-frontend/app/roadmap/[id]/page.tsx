// app/roadmap/[id]/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import api from "../../lib/api";
import { getAuth } from "../../lib/auth";
import { RoadmapItem } from "../../components/RoadmapItemList";

type RawNode = any;

export default function UserRoadmapPage() {
  const params = useParams();
  const id = params?.id as string | number | undefined;
  const router = useRouter();
  const { token, user } = getAuth();

  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [hoveredItemId, setHoveredItemId] = useState<string | number | null>(null);
  const [busyItemId, setBusyItemId] = useState<string | number | null>(null);
  const [existingTasks, setExistingTasks] = useState<any[]>([]); // current kanban tasks for this upg
  const [loadingKanbanTasks, setLoadingKanbanTasks] = useState(false);

  function nodeToItem(n: RawNode, idx: number): RoadmapItem {
    const d = n?.data ?? n?.payload ?? n ?? {};
    const title = d.title ?? d.label ?? d.name ?? n?.label ?? `Task ${idx + 1}`;
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

  // --- Helper to load kanban tasks for this upg
  async function loadKanbanTasks() {
    if (!token || !user || !id) {
      setExistingTasks([]);
      return;
    }
    setLoadingKanbanTasks(true);
    try {
      const userId = user.id ?? user._id;
      const resp = await api(`/api/users/${userId}/predefined-goals/${id}/kanban`, {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
      });

      // Normalise common shapes:
      // - resp.kanban.tasks
      // - resp.tasks
      // - resp.kanban.groups -> flatten groups
      // - resp (array) -> assume tasks
      let tasks: any[] = [];

      if (resp == null) tasks = [];
      else if (Array.isArray(resp)) tasks = resp;
      else if (Array.isArray(resp?.tasks)) tasks = resp.tasks;
      else if (Array.isArray(resp?.kanban?.tasks)) tasks = resp.kanban.tasks;
      else if (resp?.kanban && typeof resp.kanban === "object" && resp.kanban.groups) {
        // groups: { todo: [], inprogress: [], done: [] }
        const groups = resp.kanban.groups;
        tasks = Object.values(groups).flat().filter(Boolean);
      } else if (resp?.groups && typeof resp.groups === "object") {
        tasks = Object.values(resp.groups).flat().filter(Boolean);
      } else {
        // last resort: try to detect task-like props on resp
        // if resp.tasks missing but resp has arrays under keys, attempt to flatten those arrays
        const arrs = Object.values(resp).filter(v => Array.isArray(v)) as any[];
        tasks = arrs.length > 0 ? arrs.flat() : [];
      }

      // ensure array
      tasks = Array.isArray(tasks) ? tasks : [];

      // store normalized tasks
      setExistingTasks(tasks);
    } catch (e) {
      console.warn("Failed to load kanban tasks:", e);
      setExistingTasks([]);
    } finally {
      setLoadingKanbanTasks(false);
    }
  }

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      try {
        if (!token || !user) {
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

        // also load existing kanban tasks to mark items that are already added
        await loadKanbanTasks();
      } catch (err: any) {
        console.error("Failed to load roadmap items:", err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, token]);

  // --- robust match: determine if a roadmap item is already in kanban tasks
  function isItemAlreadyInKanban(item: RoadmapItem, tasks: any[]) {
    if (!item || !tasks || tasks.length === 0) return false;

    // quick checks: roadmap item may carry an explicit flag or user_task id under raw
    if ((item as any).added) return true;
    if ((item as any).user_task_id || (item as any).userTaskId) return true;
    if (item.raw && (item.raw.user_task_id || item.raw.userTaskId || item.raw.user_task?.id)) return true;

    const itemIdStr = item.id != null ? String(item.id) : null;
    const itemTitle = (item.title || "").trim().toLowerCase();
    const itemSkillId = (item as any).skill_id ?? (item as any).predefined_skill_id ?? (item.raw && (item.raw.skill_id ?? item.raw.predefined_skill_id));

    for (const t of tasks) {
      if (!t) continue;
      // candidate fields in the task
      const cand = [
        t.id,
        t._id,
        t.user_task_id,
        t.userTaskId,
        t.predefined_task_id,
        t.predefined_skill_id,
        t.skill_id,
        t.metadata?.sourceId,
        t.metadata?.source_id,
        t.metadata?.skillId,
        t.metadata?.source?.sourceId,
      ].filter(Boolean);

      // exact id match if roadmap item had source id recorded
      if (itemIdStr && cand.some(c => String(c) === itemIdStr)) return true;

      // title exact match (case-insensitive)
      if (typeof t.title === "string" && itemTitle && t.title.trim().toLowerCase() === itemTitle) return true;

      // skill/source matching
      const taskSkillCand = [t.skill_id, t.predefined_skill_id, t.predefined_task_id, t.metadata?.skillId, t.metadata?.sourceId].filter(Boolean);
      if (itemSkillId != null && taskSkillCand.some(c => String(c) === String(itemSkillId))) return true;

      // sometimes tasks include metadata.source === 'roadmap' and sourceId or reference
      if (t.metadata && (t.metadata.source === "roadmap" || t.metadata.source === "roadmap_item" || t.metadata.source === "predefined_skill")) {
        const sid = t.metadata.sourceId ?? t.metadata.source_id ?? t.metadata.refId ?? t.metadata.ref;
        if (sid && itemIdStr && String(sid) === itemIdStr) return true;
      }
    }

    return false;
  }

  async function addSingleToKanban(item: RoadmapItem) {
    if (!token || !user) {
      router.push("/auth/login");
      return;
    }
    const already = isItemAlreadyInKanban(item, existingTasks);
    if (already) {
      // give gentle feedback
      alert("This item already exists in your Kanban board.");
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
      const resp = await api(`/api/users/${userId}/predefined-goals/${id}/kanban/tasks`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: payload,
      });

      // If the API returns the created task, append it into existingTasks so UI updates immediately.
      // Accept multiple shapes (created task under resp.created, resp.task, resp)
      const created = resp?.created ?? resp?.task ?? resp?.createdTask ?? resp ?? null;
      if (created) {
        setExistingTasks(prev => {
          // avoid duplicates: check if created.id already present
          const alreadyPresent = prev.some(t => String(t.id ?? t._id ?? t.user_task_id) === String(created.id ?? created._id ?? created.user_task_id));
          if (alreadyPresent) return prev;
          return [created, ...prev];
        });
      } else {
        // If no created object returned, optimistically inject a synthetic placeholder so Add button hides
        setExistingTasks(prev => [{ id: `roadmap-synth-${item.id}`, title: item.title, metadata: { source: "roadmap", sourceId: item.id } }, ...prev]);
      }

      // give user feedback
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

  async function addAllToKanban() {
    if (!token || !user) {
      router.push("/auth/login");
      return;
    }
    const userId = user.id ?? user._id;
    try {
      const payload = { tasks: items.map(it => ({ title: it.title, description: it.description, start: it.start, end: it.end, metadata: { source: "roadmap", sourceId: it.id } })) };
      await api(`/api/users/${userId}/predefined-goals/${id}/kanban/tasks`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: payload,
      });

      // after bulk add, refresh kanban tasks to get authoritative results
      await loadKanbanTasks();

      // eslint-disable-next-line no-alert
      alert("All roadmap items added to Kanban");
      router.push(`/kanban/${id}`);
    } catch (bulkErr) {
      console.warn("Bulk add failed, falling back to per-item add", bulkErr);
      // fallback per-item (sequential)
      for (const it of items) {
        // eslint-disable-next-line no-await-in-loop
        await addSingleToKanban(it);
      }
      await loadKanbanTasks();
      router.push(`/kanban/${id}`);
    }
  }

  return (
    <div className="roadmap-container">
      <div className="roadmap-header">
        <div className="roadmap-header-content">
          <h1 className="roadmap-title">Development Roadmap</h1>
          <p className="roadmap-subtitle">
            Your personalized learning path with curated resources and milestones
          </p>
        </div>

        <div className="roadmap-actions">
          <button onClick={() => router.push(`/kanban/${id}`)} className="roadmap-btn roadmap-btn-secondary">
            <span className="btn-icon">📋</span>
            Open Kanban
          </button>
          <button onClick={addAllToKanban} className="roadmap-btn roadmap-btn-primary">
            <span className="btn-icon">✓</span>
            Add All to Kanban
          </button>
        </div>
      </div>

      {loading ? (
        <div className="roadmap-loading">
          <div className="loading-spinner"></div>
          <p>Loading your roadmap...</p>
        </div>
      ) : items.length === 0 ? (
        <div className="roadmap-empty">
          <div className="empty-icon">🗺️</div>
          <p>No roadmap items found</p>
          <span>Start by creating your learning path</span>
        </div>
      ) : (
        <div className="roadmap-timeline">
          <div className="timeline-line"></div>

          {items.map((item, index) => {
            const isHovered = hoveredItemId === item.id;
            const isBusy = busyItemId === item.id;
            const already = isItemAlreadyInKanban(item, existingTasks);

            return (
              <div
                key={item.id}
                className={`timeline-item ${isHovered ? "timeline-item-hovered" : ""}`}
                onMouseEnter={() => setHoveredItemId(item.id)}
                onMouseLeave={() => setHoveredItemId(null)}
              >
                <div className="timeline-marker">
                  <div className="marker-outer">
                    <div className="marker-inner">
                      <span className="marker-number">{String(index + 1).padStart(2, "0")}</span>
                    </div>
                  </div>
                  <div className="marker-pulse"></div>
                </div>

                <div className="timeline-content">
                  <div className="content-card">
                    <div className="card-header">
                      <h3 className="card-title">{item.title}</h3>
                      <div className="card-actions">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!already && !isBusy) addSingleToKanban(item);
                          }}
                          className="action-btn"
                          disabled={isBusy || already}
                          title={already ? "Already in Kanban" : "Add to Kanban"}
                        >
                          {isBusy ? "..." : (already ? "✓" : "+")}
                        </button>
                      </div>
                    </div>

                    <div className={`card-body ${isHovered ? "card-body-expanded" : ""}`}>
                      {item.description && <p className="card-description">{item.description}</p>}

                      {(item.start || item.end) && (
                        <div className="card-timeline-info">
                          <span className="timeline-icon">⏱️</span>
                          <span className="timeline-dates">
                            {item.start && new Date(item.start).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            {item.start && item.end && " → "}
                            {item.end && new Date(item.end).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                      )}

                      {isHovered && Array.isArray(item.resources) && item.resources.length > 0 && (
                        <div className="card-resources">
                          <div className="resources-header">
                            <span className="resources-icon">🔗</span>
                            <span className="resources-title">Resources</span>
                          </div>
                          <div className="resources-list">
                            {item.resources.map((resource, idx) => (
                              <a
                                key={idx}
                                href={resource.url}
                                target="_blank"
                                rel="noreferrer"
                                className="resource-link"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <span className="resource-icon">→</span>
                                <span className="resource-label">{resource.label}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="card-footer">
                      <div className="progress-indicator">
                        <div className="progress-bar" style={{ width: "0%" }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
