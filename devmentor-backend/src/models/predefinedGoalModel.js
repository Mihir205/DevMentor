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

/**
 * Return suggested projects (predefined_mini_projects) for a predefined goal.
 * This does NOT insert anything into user_tasks; it merely returns the rows so the controller can send suggestions to the client.
 */
export const getSuggestedProjectsForUserPredefinedGoal = async (userPredefinedGoalId) => {
  const x = await pool.query(`SELECT predefined_goal_id FROM user_predefined_goals WHERE id = $1`, [userPredefinedGoalId]);
  if (!x.rows.length) return [];
  const predefinedGoalId = x.rows[0].predefined_goal_id;
  // reuse the earlier helper that returns minis for a predefinedGoalId:
  const { minis } = await getRoadmapByPredefinedGoalId(predefinedGoalId);
  return (minis || []).map(m => ({
    id: m.id,
    title: m.title,
    description: m.description,
    difficulty: m.difficulty,
    skill_id: m.skill_id,
    link: m.link || null,
  }));
};

/* Copy predefined_mini_projects -> user_tasks for a user's selected goal
   NOTE: This function is preserved for legacy/admin use. The controller will NOT call this by default anymore.
*/
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

/* Get user_predefined_goal row by id */
export const getUserPredefinedGoal = async (userPredefinedGoalId) => {
  const q = `SELECT * FROM user_predefined_goals WHERE id = $1`;
  const { rows } = await pool.query(q, [userPredefinedGoalId]);
  return rows[0] ?? null;
};

/* Progress summary for a user_predefined_goal (counts tasks) */
/* src/models/predefinedGoalModel.js */
export const getProgressForUserPredefinedGoal = async (userPredefinedGoalId) => {
  // 0) sanity
  if (!userPredefinedGoalId) throw new Error("userPredefinedGoalId required");

  // ---------------------
  // A) Task-based counts (original approach, but robustified)
  // ---------------------
  const taskQ = `
    SELECT
      COALESCE(COUNT(*),0) AS total_tasks,
      COALESCE(COUNT(*) FILTER (WHERE LOWER(COALESCE(status,'')) = 'done'),0) AS done_tasks
    FROM user_tasks
    WHERE user_predefined_goal_id = $1
      AND NOT (
        predefined_project_id IS NOT NULL
        OR (metadata IS NOT NULL AND LOWER(COALESCE(metadata->>'source','')) = 'predefined_project')
      );
  `;
  const taskRes = await pool.query(taskQ, [userPredefinedGoalId]);
  const taskRow = taskRes.rows[0] ?? { total_tasks: 0, done_tasks: 0 };
  const totalTasks = Number(taskRow.total_tasks || 0);
  const doneTasks = Number(taskRow.done_tasks || 0);
  const allTasksDone = totalTasks > 0 && totalTasks === doneTasks;

  // ---------------------
  // B) Skill-based counts (recommended)
  // For each skill of the predefined goal:
  //  - if user_predefined_skill_status.status = 'done' => skill done
  //  - else if skill has >=1 related user_tasks and ALL those tasks are 'done' => skill done
  //  - else skill not done
  // ---------------------
  // first find predefined_goal_id for UPG
  const upgQ = `SELECT predefined_goal_id FROM user_predefined_goals WHERE id = $1 LIMIT 1;`;
  const upgRes = await pool.query(upgQ, [userPredefinedGoalId]);
  if (!upgRes.rows.length) {
    // no UPG -> return sensible zeros (caller likely handled this already)
    return {
      totalTasks, doneTasks, allDone: allTasksDone,
      totalSkills: 0, doneSkills: 0, allSkillsDone: false
    };
  }
  const predefinedGoalId = upgRes.rows[0].predefined_goal_id;

  const skillsQ = `
    SELECT
      s.id AS skill_id,
      COALESCE(ups.status, NULL) AS user_status,
      COUNT(ut.id) FILTER (WHERE ut.id IS NOT NULL) AS total_tasks_for_skill,
      COUNT(ut.id) FILTER (WHERE ut.id IS NOT NULL AND LOWER(COALESCE(ut.status,'')) = 'done') AS done_tasks_for_skill
    FROM predefined_skills s
    LEFT JOIN user_predefined_skill_status ups
      ON ups.user_predefined_goal_id = $1 AND ups.predefined_skill_id = s.id
    LEFT JOIN predefined_mini_projects p
      ON p.skill_id = s.id
    LEFT JOIN user_tasks ut
      ON ut.user_predefined_goal_id = $1
      AND ut.predefined_project_id = p.id
    WHERE s.predefined_goal_id = $2
    GROUP BY s.id, ups.status
    ORDER BY s.position NULLS LAST, s.id;
  `;
  const skillsRes = await pool.query(skillsQ, [userPredefinedGoalId, predefinedGoalId]);
  const skillRows = skillsRes.rows || [];

  const totalSkills = skillRows.length;
  let doneSkills = 0;

  for (const r of skillRows) {
    const userStatus = (r.user_status ?? null);
    const totalTasksForSkill = Number(r.total_tasks_for_skill ?? 0);
    const doneTasksForSkill = Number(r.done_tasks_for_skill ?? 0);

    const skillDoneByStatus = userStatus && String(userStatus).toLowerCase() === "done";
    const skillDoneByTasks = (totalTasksForSkill > 0) && (totalTasksForSkill === doneTasksForSkill);

    if (skillDoneByStatus || skillDoneByTasks) doneSkills++;
  }

  const allSkillsDone = (totalSkills > 0 && doneSkills === totalSkills);

  // Return both metrics. Keep 'allDone' for compatibility mapped to skill-based (recommended).
  return {
    // task-based (legacy)
    totalTasks,
    doneTasks,
    allTasksDone,

    // skill-based (recommended)
    totalSkills,
    doneSkills,
    allSkillsDone,

    // compatibility: old controller expects allDone boolean — map it to skill-based unlocking
    allDone: allSkillsDone
  };
};


/* Persist selected project for a user_predefined_goal (upsert) and return selection with project details */
export const selectProjectForUserPredefinedGoal = async (userPredefinedGoalId, predefinedProjectId) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // insert or update the selected project
    const upsertQ = `
      INSERT INTO user_selected_projects (user_predefined_goal_id, predefined_project_id)
      VALUES ($1, $2)
      ON CONFLICT (user_predefined_goal_id) DO UPDATE SET predefined_project_id = EXCLUDED.predefined_project_id, created_at = now()
      RETURNING *;
    `;
    const upsertRes = await client.query(upsertQ, [userPredefinedGoalId, predefinedProjectId]);
    const selectedRow = upsertRes.rows[0];

    // fetch enriched project details to return
    const detailQ = `
      SELECT p.id AS predefined_project_id, p.skill_id, p.title, p.description, p.difficulty, p.link
      FROM predefined_mini_projects p
      WHERE p.id = $1
      LIMIT 1;
    `;
    const detailRes = await client.query(detailQ, [predefinedProjectId]);
    const project = detailRes.rows[0] ?? null;

    await client.query("COMMIT");
    return { selected: selectedRow, project };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
};

/* Optionally: get selected project for a given user_predefined_goal_id */
export const getSelectedProjectForUserPredefinedGoal = async (userPredefinedGoalId) => {
  const q = `
    SELECT s.id AS selection_id, s.predefined_project_id,
           p.title, p.description, p.difficulty, p.link
    FROM user_selected_projects s
    JOIN predefined_mini_projects p ON p.id = s.predefined_project_id
    WHERE s.user_predefined_goal_id = $1
    LIMIT 1;
  `;
  const { rows } = await pool.query(q, [userPredefinedGoalId]);
  return rows[0] ?? null;
};
