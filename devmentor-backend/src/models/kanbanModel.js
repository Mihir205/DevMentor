// src/models/kanbanModel.js
import { pool } from "../config/db.js";

export const getKanbanForUserPredefinedGoal = async (userPredefinedGoalId) => {
  const q = `
    SELECT id, predefined_project_id, title, description, status, difficulty, link, created_at, updated_at
    FROM user_tasks
    WHERE user_predefined_goal_id = $1
    ORDER BY created_at;
  `;
  const { rows } = await pool.query(q, [userPredefinedGoalId]);
  const groups = { todo: [], inprogress: [], done: [], blocked: [] };
  for (const r of rows) {
    const s = (r.status || "todo").toLowerCase();
    if (!groups[s]) groups[s] = [];
    groups[s].push(r);
  }
  return groups;
};

export const updateUserTaskStatus = async (taskId, status) => {
  const allowed = ["todo","inprogress","done","blocked"];
  if (!allowed.includes(status)) throw new Error("invalid status");
  const q = `UPDATE user_tasks SET status = $1, updated_at = now() WHERE id = $2 RETURNING *`;
  const { rows } = await pool.query(q, [status, taskId]);
  return rows[0];
};

export const createUserTask = async ({ userPredefinedGoalId, title, description, difficulty = "beginner", link = null }) => {
  const q = `INSERT INTO user_tasks (user_predefined_goal_id, title, description, difficulty, link)
             VALUES ($1,$2,$3,$4,$5) RETURNING *`;
  const { rows } = await pool.query(q, [userPredefinedGoalId, title, description, difficulty, link]);
  return rows[0];
};
