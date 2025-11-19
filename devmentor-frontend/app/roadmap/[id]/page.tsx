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
      } catch (err: any) {
        console.error("Failed to load roadmap items:", err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, token]);

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
      alert("All roadmap items added to Kanban");
      router.push(`/kanban/${id}`);
    } catch (bulkErr) {
      console.warn("Bulk add failed, falling back to per-item add", bulkErr);
      for (const it of items) {
        // eslint-disable-next-line no-await-in-loop
        await addSingleToKanban(it);
      }
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
            
            return (
              <div 
                key={item.id} 
                className={`timeline-item ${isHovered ? 'timeline-item-hovered' : ''}`}
                onMouseEnter={() => setHoveredItemId(item.id)}
                onMouseLeave={() => setHoveredItemId(null)}
              >
                <div className="timeline-marker">
                  <div className="marker-outer">
                    <div className="marker-inner">
                      <span className="marker-number">{String(index + 1).padStart(2, '0')}</span>
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
                            addSingleToKanban(item);
                          }} 
                          className="action-btn"
                          disabled={isBusy}
                        >
                          {isBusy ? '...' : '+'}
                        </button>
                      </div>
                    </div>

                    <div className={`card-body ${isHovered ? 'card-body-expanded' : ''}`}>
                      {item.description && (
                        <p className="card-description">{item.description}</p>
                      )}

                      {(item.start || item.end) && (
                        <div className="card-timeline-info">
                          <span className="timeline-icon">⏱️</span>
                          <span className="timeline-dates">
                            {item.start && new Date(item.start).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {item.start && item.end && ' → '}
                            {item.end && new Date(item.end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
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
                        <div className="progress-bar" style={{ width: '0%' }}></div>
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