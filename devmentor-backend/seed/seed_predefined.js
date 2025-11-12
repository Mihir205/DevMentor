// seed/seed_predefined.js
import fs from "fs/promises";
import path from "path";
import { pool } from "../src/config/db.js";

async function seed() {
  const file = path.resolve("data", "predefined_goals.json");
  const raw = await fs.readFile(file, "utf8");
  const templates = JSON.parse(raw);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (const tpl of templates) {
      // insert goal template (use upsert by slug)
      const insertGoalQ = `
        INSERT INTO predefined_goals (slug, title, description)
        VALUES ($1,$2,$3)
        ON CONFLICT (slug) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description
        RETURNING id;
      `;
      const goalRes = await client.query(insertGoalQ, [tpl.slug, tpl.title, tpl.description]);
      const predefinedGoalId = goalRes.rows[0].id;

      // map skill keys -> ids
      const skillKeyToId = {};

      // insert skills
      for (const s of tpl.skills || []) {
        const q = `
          INSERT INTO predefined_skills (predefined_goal_id, key, title, description, position, difficulty)
          VALUES ($1,$2,$3,$4,$5,$6)
          ON CONFLICT (predefined_goal_id, key) DO UPDATE SET title = EXCLUDED.title, description = EXCLUDED.description, position = EXCLUDED.position, difficulty = EXCLUDED.difficulty
          RETURNING id;
        `;
        const r = await client.query(q, [predefinedGoalId, s.key, s.title, s.description || null, s.position || 0, s.difficulty || 1]);
        const sid = r.rows[0].id;
        skillKeyToId[s.key] = sid;
      }

      // insert edges (if any)
      for (const e of tpl.edges || []) {
        const fromId = skillKeyToId[e.from_key];
        const toId = skillKeyToId[e.to_key];
        if (!fromId || !toId) continue;
        await client.query(
          `INSERT INTO predefined_skill_edges (predefined_goal_id, from_skill, to_skill, note)
           VALUES ($1,$2,$3,$4)
           ON CONFLICT DO NOTHING;`,
          [predefinedGoalId, fromId, toId, e.note || null]
        );
      }

      // insert resources
      for (const r of tpl.resources || []) {
        const nodeId = skillKeyToId[r.skill_key];
        if (!nodeId) continue;
        await client.query(
          `INSERT INTO predefined_resources (skill_id, title, type, url, score)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT DO NOTHING;`,
          [nodeId, r.title, r.type || null, r.url || null, r.score || 0]
        );
      }

      // insert mini-projects
      for (const p of tpl.projects || []) {
        const nodeId = skillKeyToId[p.skill_key];
        // allow skill-less projects by skipping if node missing
        await client.query(
          `INSERT INTO predefined_mini_projects (skill_id, title, description, difficulty, link)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT DO NOTHING;`,
          [nodeId || null, p.title, p.description || null, p.difficulty || "beginner", p.link || null]
        );
      }
    }

    await client.query("COMMIT");
    console.log("Predefined templates seeded/updated.");
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Seed error:", err);
  } finally {
    client.release();
    process.exit(0);
  }
}

seed();
