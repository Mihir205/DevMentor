// seed/seed_predefined.js
// Usage: node seed/seed_predefined.js
import fs from "fs/promises";
import fsSync from "fs";
import path from "path";
import { pool } from "../src/config/db.js";

async function fileExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function seed() {
  const jsonFilename = process.env.PREDEFINED_JSON ?? "predefined_goals.json";
  const file = path.resolve(process.cwd(), "data", jsonFilename);

  if (!fsSync.existsSync(file)) {
    console.error(`ERROR: JSON file not found at ${file}`);
    console.error("Place your JSON file at data/predefined_goals.json or set PREDEFINED_JSON env var to its filename.");
    process.exit(2);
  }

  let raw;
  try {
    raw = await fs.readFile(file, "utf8");
  } catch (err) {
    console.error("Failed to read JSON file:", err);
    process.exit(3);
  }

  let templates;
  try {
    templates = JSON.parse(raw);
  } catch (err) {
    console.error("Invalid JSON:", err);
    process.exit(4);
  }

  const client = await pool.connect();

  let totals = { goals: 0, skills: 0, edges: 0, resources: 0, projects: 0 };

  try {
    await client.query("BEGIN");

    for (const tpl of templates) {
      totals.goals++;

      const insertGoalQ = `
        INSERT INTO predefined_goals (slug, title, description)
        VALUES ($1,$2,$3)
        ON CONFLICT (slug) DO UPDATE
          SET title = EXCLUDED.title,
              description = EXCLUDED.description
        RETURNING id;
      `;
      const goalRes = await client.query(insertGoalQ, [tpl.slug, tpl.title, tpl.description]);
      const predefinedGoalId = goalRes.rows[0].id;

      const skillKeyToId = {};

      // Skills
      for (const s of tpl.skills || []) {
        const q = `
          INSERT INTO predefined_skills (predefined_goal_id, key, title, description, position, difficulty)
          VALUES ($1,$2,$3,$4,$5,$6)
          ON CONFLICT (predefined_goal_id, key) DO UPDATE
            SET title = EXCLUDED.title,
                description = EXCLUDED.description,
                position = EXCLUDED.position,
                difficulty = EXCLUDED.difficulty
          RETURNING id;
        `;
        const r = await client.query(q, [
          predefinedGoalId,
          s.key,
          s.title,
          s.description ?? null,
          s.position ?? 0,
          s.difficulty ?? 1,
        ]);
        const sid = r.rows[0].id;
        skillKeyToId[s.key] = sid;
        totals.skills++;
      }

      // Edges
      for (const e of tpl.edges || []) {
        const fromId = skillKeyToId[e.from_key];
        const toId = skillKeyToId[e.to_key];
        if (!fromId || !toId) {
          console.warn(`[WARN] Edge skipped for goal=${tpl.slug}: missing skill id for ${e.from_key} or ${e.to_key}`);
          continue;
        }
        const edgeQ = `
          INSERT INTO predefined_skill_edges (predefined_goal_id, from_skill, to_skill, note)
          VALUES ($1,$2,$3,$4)
          ON CONFLICT (predefined_goal_id, from_skill, to_skill) DO UPDATE
            SET note = COALESCE(EXCLUDED.note, predefined_skill_edges.note)
          RETURNING id;
        `;
        await client.query(edgeQ, [predefinedGoalId, fromId, toId, e.note ?? null]);
        totals.edges++;
      }

      // Resources
      for (const r of tpl.resources || []) {
        const nodeId = skillKeyToId[r.skill_key];
        if (!nodeId) {
          console.warn(`[WARN] Resource skipped for goal=${tpl.slug}: unknown skill_key "${r.skill_key}"`);
          continue;
        }
        const resourceQ = `
          INSERT INTO predefined_resources (skill_id, title, type, url, score)
          VALUES ($1,$2,$3,$4,$5)
          ON CONFLICT (skill_id, url) DO UPDATE
            SET title = EXCLUDED.title,
                type = COALESCE(EXCLUDED.type, predefined_resources.type),
                score = COALESCE(EXCLUDED.score, predefined_resources.score)
          RETURNING id;
        `;
        await client.query(resourceQ, [nodeId, r.title, r.type ?? null, r.url ?? null, r.score ?? 0]);
        totals.resources++;
      }

      // Mini-projects
      for (const p of tpl.projects || []) {
        const nodeId = skillKeyToId[p.skill_key] ?? null;
        const projQ = `
          INSERT INTO predefined_mini_projects (skill_id, title, description, difficulty, link)
          VALUES ($1,$2,$3,$4,$5)
          ON CONFLICT (skill_id, title) DO UPDATE
            SET description = COALESCE(EXCLUDED.description, predefined_mini_projects.description),
                difficulty = COALESCE(EXCLUDED.difficulty, predefined_mini_projects.difficulty),
                link = COALESCE(EXCLUDED.link, predefined_mini_projects.link)
          RETURNING id;
        `;
        await client.query(projQ, [nodeId, p.title, p.description ?? null, p.difficulty ?? "beginner", p.link ?? null]);
        totals.projects++;
      }
    }

    await client.query("COMMIT");
    console.log("✅ Seeding complete.");
    console.log(`Totals: goals=${totals.goals}, skills=${totals.skills}, edges=${totals.edges}, resources=${totals.resources}, projects=${totals.projects}`);
    process.exit(0);
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed transaction failed:", err);
    process.exit(5);
  } finally {
    client.release();
  }
}

seed().catch((e) => {
  console.error("Fatal seeder error:", e);
  process.exit(10);
});
