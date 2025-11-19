// src/models/adminModel.js
import { pool } from "../config/db.js";

/**
 * List users with a small summary and their selected goals (with progress).
 * Supports simple pagination: limit, offset.
 */
export const listUsersWithSelectedGoals = async ({ limit = 50, offset = 0 } = {}) => {
  // For each user's selected goal we include progress totals (excluding project tasks)
  const q = `
    SELECT u.id AS user_id, u.name, u.email, u.created_at,
           json_agg(json_build_object(
             'user_predefined_goal_id', upg.id,
             'predefined_goal_id', pg.id,
             'title', pg.title,
             'description', pg.description,
             'created_at', upg.created_at,
             'totalTasks', COALESCE(ct.total_tasks,0),
             'doneTasks', COALESCE(ct.done_tasks,0),
             'allDone', CASE WHEN COALESCE(ct.total_tasks,0) > 0 AND COALESCE(ct.total_tasks,0) = COALESCE(ct.done_tasks,0) THEN TRUE ELSE FALSE END
           ) ORDER BY upg.created_at DESC) AS selected_goals
    FROM users u
    LEFT JOIN user_predefined_goals upg ON upg.user_id = u.id
    LEFT JOIN predefined_goals pg ON pg.id = upg.predefined_goal_id
    LEFT JOIN (
      SELECT user_predefined_goal_id,
             COUNT(*) FILTER (WHERE NOT (predefined_project_id IS NOT NULL OR (metadata IS NOT NULL AND (metadata->>'source') = 'predefined_project'))) AS total_tasks,
             COUNT(*) FILTER (WHERE status = 'done' AND NOT (predefined_project_id IS NOT NULL OR (metadata IS NOT NULL AND (metadata->>'source') = 'predefined_project'))) AS done_tasks
      FROM user_tasks
      GROUP BY user_predefined_goal_id
    ) ct ON ct.user_predefined_goal_id = upg.id
    GROUP BY u.id
    ORDER BY u.created_at DESC
    LIMIT $1 OFFSET $2;
  `;
  const { rows } = await pool.query(q, [limit, offset]);
  // normalize selected_goals null -> []
  return rows.map(r => ({
    user_id: r.user_id,
    name: r.name,
    email: r.email,
    created_at: r.created_at,
    selected_goals: Array.isArray(r.selected_goals) && r.selected_goals[0] !== null ? r.selected_goals : []
  }));
};

/**
 * Get a single user with selected goals + progress details.
 */
export const getUserWithSelectedGoals = async (userId) => {
  const q = `
    SELECT u.id AS user_id, u.name, u.email, u.created_at,
           json_agg(json_build_object(
             'user_predefined_goal_id', upg.id,
             'predefined_goal_id', pg.id,
             'title', pg.title,
             'description', pg.description,
             'created_at', upg.created_at,
             'totalTasks', COALESCE(ct.total_tasks,0),
             'doneTasks', COALESCE(ct.done_tasks,0),
             'allDone', CASE WHEN COALESCE(ct.total_tasks,0) > 0 AND COALESCE(ct.total_tasks,0) = COALESCE(ct.done_tasks,0) THEN TRUE ELSE FALSE END
           ) ORDER BY upg.created_at DESC) AS selected_goals
    FROM users u
    LEFT JOIN user_predefined_goals upg ON upg.user_id = u.id
    LEFT JOIN predefined_goals pg ON pg.id = upg.predefined_goal_id
    LEFT JOIN (
      SELECT user_predefined_goal_id,
             COUNT(*) FILTER (WHERE NOT (predefined_project_id IS NOT NULL OR (metadata IS NOT NULL AND (metadata->>'source') = 'predefined_project'))) AS total_tasks,
             COUNT(*) FILTER (WHERE status = 'done' AND NOT (predefined_project_id IS NOT NULL OR (metadata IS NOT NULL AND (metadata->>'source') = 'predefined_project'))) AS done_tasks
      FROM user_tasks
      GROUP BY user_predefined_goal_id
    ) ct ON ct.user_predefined_goal_id = upg.id
    WHERE u.id = $1
    GROUP BY u.id;
  `;
  const { rows } = await pool.query(q, [userId]);
  if (!rows.length) return null;
  const r = rows[0];
  return {
    user_id: r.user_id,
    name: r.name,
    email: r.email,
    created_at: r.created_at,
    selected_goals: Array.isArray(r.selected_goals) && r.selected_goals[0] !== null ? r.selected_goals : []
  };
};
