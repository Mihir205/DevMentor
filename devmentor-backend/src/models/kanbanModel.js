// src/models/kanbanModel.js
import { pool } from "../config/db.js";

/**
 * Return an object { tasks: [...rows], groups: { todo:[], inprogress:[], done:[], blocked:[] } }
 */
export const getKanbanForUserPredefinedGoal = async (userPredefinedGoalId) => {
  const q = `
    SELECT id, user_predefined_goal_id, predefined_project_id, title, description, status, difficulty, link, metadata, created_at, updated_at
    FROM user_tasks
    WHERE user_predefined_goal_id = $1
    ORDER BY created_at;
  `;
  const { rows } = await pool.query(q, [userPredefinedGoalId]);

  // tasks array
  const tasks = rows.map(r => ({
    ...r,
    metadata: r.metadata ?? null,
  }));

  // grouped view (for legacy consumers)
  const groups = { todo: [], inprogress: [], done: [], blocked: [] };
  for (const r of rows) {
    const s = (r.status || "todo").toLowerCase();
    if (!groups[s]) groups[s] = [];
    groups[s].push(r);
  }

  return { tasks, groups };
};

/**
 * Find a task by metadata.source + metadata.sourceId for a given user_predefined_goal_id.
 * Returns first matching row or null.
 */
export const findTaskByMetadata = async ({ userPredefinedGoalId, source, sourceId }) => {
  if (!source || sourceId === null || sourceId === undefined) return null;

  const q = `
    SELECT *
    FROM user_tasks
    WHERE user_predefined_goal_id = $1
      AND metadata->>'source' = $2
      AND metadata->>'sourceId' = $3
    LIMIT 1;
  `;
  const { rows } = await pool.query(q, [userPredefinedGoalId, String(source), String(sourceId)]);
  return rows[0] ?? null;
};

/**
 * Update status
 */
export const updateUserTaskStatus = async (taskId, status) => {
  const allowed = ["todo","inprogress","done","blocked"];
  if (!allowed.includes(status)) throw new Error("invalid status");
  const q = `UPDATE user_tasks SET status = $1, updated_at = now() WHERE id = $2 RETURNING *`;
  const { rows } = await pool.query(q, [status, taskId]);
  return rows[0];
};

/**
 * Create a user task. Accepts metadata (object) and persists it into JSONB column.
 * Returns the created row.
 */
export const createUserTask = async ({ userPredefinedGoalId, title, description = null, difficulty = "beginner", link = null, metadata = null }) => {
  // debug log for server-side verification (remove or lower log-level in prod)
  console.debug("createUserTask payload:", { userPredefinedGoalId, title, metadata });

  const q = `
    INSERT INTO user_tasks (user_predefined_goal_id, title, description, difficulty, link, metadata)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *;
  `;
  const metaValue = metadata ? JSON.stringify(metadata) : null;
  const { rows } = await pool.query(q, [userPredefinedGoalId, title, description, difficulty, link, metaValue]);
  return rows[0];
};
