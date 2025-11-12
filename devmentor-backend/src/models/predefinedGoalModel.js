// src/models/predefinedGoalModel.js
import { pool } from "../config/db.js";

/* List templates */
export const listPredefinedGoals = async () => {
  const q = `SELECT id, slug, title, description FROM predefined_goals ORDER BY id`;
  const { rows } = await pool.query(q);
  return rows;
};

/* Raw roadmap pieces for a given predefined goal id */
export const getRoadmapByPredefinedGoalId = async (predefinedGoalId) => {
  const skillsQ = `
    SELECT id, key, title, description, position, difficulty
    FROM predefined_skills
    WHERE predefined_goal_id = $1
    ORDER BY position NULLS LAST, id
  `;
  const edgesQ = `
    SELECT id, from_skill, to_skill, note
    FROM predefined_skill_edges
    WHERE predefined_goal_id = $1
  `;

  const skillsRes = await pool.query(skillsQ, [predefinedGoalId]);
  const edgesRes = await pool.query(edgesQ, [predefinedGoalId]);

  const skills = skillsRes.rows;
  const edges = edgesRes.rows;

  const skillIds = skills.map(s => s.id);
  let resources = [], minis = [];
  if (skillIds.length) {
    const resourcesQ = `SELECT id, skill_id, title, type, url, score FROM predefined_resources WHERE skill_id = ANY($1)`;
    const minisQ = `SELECT id, skill_id, title, description, difficulty, link FROM predefined_mini_projects WHERE skill_id = ANY($1)`;
    const [resR, miniR] = await Promise.all([pool.query(resourcesQ, [skillIds]), pool.query(minisQ, [skillIds])]);
    resources = resR.rows;
    minis = miniR.rows;
  }
  return { skills, edges, resources, minis };
};

/* Add user_predefined_goals row */
export const addUserPredefinedGoal = async (userId, predefinedGoalId) => {
  const q = `
    INSERT INTO user_predefined_goals (user_id, predefined_goal_id)
    VALUES ($1, $2)
    ON CONFLICT (user_id, predefined_goal_id) DO NOTHING
    RETURNING *;
  `;
  const r = await pool.query(q, [userId, predefinedGoalId]);
  if (r.rows.length) return r.rows[0];
  const existing = await pool.query(
    `SELECT * FROM user_predefined_goals WHERE user_id = $1 AND predefined_goal_id = $2`,
    [userId, predefinedGoalId]
  );
  return existing.rows[0];
};

/* Copy predefined_mini_projects -> user_tasks for a user's selected goal */
export const createTasksFromTemplate = async (userPredefinedGoalId, predefinedGoalId) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existingRes = await client.query(
      `SELECT predefined_project_id FROM user_tasks WHERE user_predefined_goal_id = $1 AND predefined_project_id IS NOT NULL`,
      [userPredefinedGoalId]
    );
    const existingIds = new Set(existingRes.rows.map(r => r.predefined_project_id).filter(Boolean));

    const projectsQ = `
      SELECT p.id AS predefined_project_id, p.title, p.description, p.difficulty, p.link
      FROM predefined_mini_projects p
      JOIN predefined_skills s ON s.id = p.skill_id
      WHERE s.predefined_goal_id = $1
    `;
    const projRes = await client.query(projectsQ, [predefinedGoalId]);
    for (const p of projRes.rows) {
      if (existingIds.has(p.predefined_project_id)) continue;
      await client.query(
        `INSERT INTO user_tasks (user_predefined_goal_id, predefined_project_id, title, description, difficulty, link)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [userPredefinedGoalId, p.predefined_project_id, p.title, p.description, p.difficulty, p.link]
      );
    }

    await client.query("COMMIT");
    return true;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

/* List user's selected templates */
export const listUserPredefinedGoals = async (userId) => {
  const q = `
    SELECT upg.id AS user_predefined_goal_id, pg.id AS predefined_goal_id, pg.slug, pg.title, pg.description, upg.created_at
    FROM user_predefined_goals upg
    JOIN predefined_goals pg ON upg.predefined_goal_id = pg.id
    WHERE upg.user_id = $1
    ORDER BY upg.created_at DESC
  `;
  const { rows } = await pool.query(q, [userId]);
  return rows;
};

/* Get roadmap merged with user statuses for a user_predefined_goal_id */
export const getRoadmapForUserPredefinedGoal = async (userPredefinedGoalId) => {
  const x = await pool.query(`SELECT predefined_goal_id, user_id FROM user_predefined_goals WHERE id = $1`, [userPredefinedGoalId]);
  if (!x.rows.length) throw new Error("user_predefined_goal not found");
  const predefinedGoalId = x.rows[0].predefined_goal_id;

  const { skills, edges, resources, minis } = await getRoadmapByPredefinedGoalId(predefinedGoalId);

  const statusRes = await pool.query(
    `SELECT predefined_skill_id, status, notes FROM user_predefined_skill_status WHERE user_predefined_goal_id = $1`,
    [userPredefinedGoalId]
  );
  const statusMap = new Map(statusRes.rows.map(r => [r.predefined_skill_id, { status: r.status, notes: r.notes }]));

  const nodes = skills.map(s => ({
    id: s.id,
    key: s.key ?? `skill_${s.id}`,
    title: s.title,
    description: s.description,
    position: s.position,
    difficulty: s.difficulty,
    user_status: statusMap.get(s.id)?.status ?? 'todo',
    user_notes: statusMap.get(s.id)?.notes ?? null,
    resources: resources.filter(r => r.skill_id === s.id),
    mini_projects: minis.filter(m => m.skill_id === s.id)
  }));

  const mappedEdges = edges.map(e => ({ id: e.id, from: e.from_skill, to: e.to_skill, note: e.note }));
  return { nodes, edges: mappedEdges };
};
