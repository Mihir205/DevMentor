// src/controllers/kanbanController.js
import * as kanbanModel from "../models/kanbanModel.js";

/**
 * GET kanban for a userPredefinedGoal
 */
export const getKanban = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (req.user?.userId !== userId) return res.status(403).json({ ok:false, error: "Forbidden" });
    const userPredefinedGoalId = Number(req.params.userPredefinedGoalId);
    if (!userPredefinedGoalId) return res.status(400).json({ ok:false, error: "userPredefinedGoalId required" });

    const kanban = await kanbanModel.getKanbanForUserPredefinedGoal(userPredefinedGoalId);
    return res.json({ ok:true, kanban });
  } catch (err) {
    console.error("getKanban", err);
    return res.status(500).json({ ok:false, error: "Server error" });
  }
};

/**
 * Robust addTask - supports single task or bulk tasks.
 * For each task with metadata.source+metadata.sourceId the function checks for existing task using model.findTaskByMetadata.
 * Returns per-item results for bulk requests.
 */
export const addTask = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (req.user?.userId !== userId) return res.status(403).json({ ok:false, error: "Forbidden" });

    const userPredefinedGoalId = Number(req.params.userPredefinedGoalId);
    if (!userPredefinedGoalId) return res.status(400).json({ ok:false, error: "userPredefinedGoalId required" });

    const body = req.body ?? {};

    // helper to create one task via model
    async function createOneTask(payload) {
      const { title, description, difficulty, link, metadata } = payload;
      if (!title) throw new Error("title required");
      return await kanbanModel.createUserTask({
        userPredefinedGoalId,
        title,
        description: description ?? null,
        difficulty: difficulty ?? "beginner",
        link: link ?? null,
        metadata: metadata ?? null,
      });
    }

    // helper to check existing
    async function findExisting(source, sourceId) {
      if (!source || sourceId === null || sourceId === undefined) return null;
      return await kanbanModel.findTaskByMetadata({
        userPredefinedGoalId,
        source,
        sourceId: String(sourceId),
      });
    }

    // Bulk flow
    if (Array.isArray(body.tasks)) {
      const tasks = body.tasks;
      const results = [];
      let addedCount = 0, existedCount = 0;

      for (const t of tasks) {
        try {
          const metadata = t.metadata ?? {};
          const source = metadata?.source ?? null;
          const sourceId = metadata?.sourceId ?? metadata?.source_id ?? null;

          // debug
          console.debug("addTask (bulk) - checking:", { title: t.title, source, sourceId });

          let existing = null;
          if (source && (sourceId !== null && sourceId !== undefined)) {
            existing = await findExisting(source, sourceId);
          }

          if (existing) {
            results.push({ existing: true, task: existing });
            existedCount++;
            continue;
          }

          const created = await createOneTask(t);
          results.push({ existing: false, task: created });
          addedCount++;
        } catch (err) {
          console.warn("addTask bulk item failed, continuing:", err);
          results.push({ existing: false, error: err.message ?? String(err), task: null });
        }
      }

      return res.status(200).json({ ok: true, results, addedCount, existedCount });
    }

    // Single task flow
    {
      const { title, description, difficulty, link, metadata } = body;
      if (!title) return res.status(400).json({ ok:false, error: "title required" });

      const source = metadata?.source ?? null;
      const sourceId = metadata?.sourceId ?? metadata?.source_id ?? null;

      if (source && (sourceId !== null && sourceId !== undefined)) {
        try {
          const existing = await findExisting(source, sourceId);
          if (existing) {
            return res.status(200).json({ ok:true, existing:true, task: existing });
          }
        } catch (innerErr) {
          console.warn("addTask: duplicate-check failed, continuing:", innerErr);
        }
      }

      const created = await createOneTask({ title, description, difficulty, link, metadata });
      return res.status(201).json({ ok:true, existing:false, task: created });
    }
  } catch (err) {
    console.error("addTask", err);
    return res.status(500).json({ ok:false, error: "Server error" });
  }
};

export const moveTask = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (req.user?.userId !== userId) return res.status(403).json({ ok:false, error: "Forbidden" });
    const taskId = Number(req.params.taskId);
    const { status } = req.body;
    if (!taskId || !status) return res.status(400).json({ ok:false, error: "taskId and status required" });
    const updated = await kanbanModel.updateUserTaskStatus(taskId, status);
    return res.json({ ok:true, task: updated });
  } catch (err) {
    console.error("moveTask", err);
    return res.status(500).json({ ok:false, error: err.message || "Server error" });
  }
};
