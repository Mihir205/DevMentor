-- schema.sql
-- DevMentor guided-only schema with predefined templates and per-user tasks (kanban)

-- USERS
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  streak INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- PREDEFINED (templates)
CREATE TABLE IF NOT EXISTS predefined_goals (
  id SERIAL PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS predefined_skills (
  id SERIAL PRIMARY KEY,
  predefined_goal_id INTEGER NOT NULL REFERENCES predefined_goals(id) ON DELETE CASCADE,
  key TEXT,
  title TEXT NOT NULL,
  description TEXT,
  position INTEGER DEFAULT 0,
  difficulty SMALLINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (predefined_goal_id, key)
);

CREATE TABLE IF NOT EXISTS predefined_skill_edges (
  id SERIAL PRIMARY KEY,
  predefined_goal_id INTEGER NOT NULL REFERENCES predefined_goals(id) ON DELETE CASCADE,
  from_skill INTEGER NOT NULL REFERENCES predefined_skills(id) ON DELETE CASCADE,
  to_skill INTEGER NOT NULL REFERENCES predefined_skills(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS predefined_resources (
  id SERIAL PRIMARY KEY,
  skill_id INTEGER REFERENCES predefined_skills(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  type TEXT,
  url TEXT,
  score SMALLINT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS predefined_mini_projects (
  id SERIAL PRIMARY KEY,
  skill_id INTEGER REFERENCES predefined_skills(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  difficulty TEXT CHECK (difficulty IN ('beginner','intermediate','advanced')) DEFAULT 'beginner',
  link TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- USER-SELECTED TEMPLATES & PROGRESS
CREATE TABLE IF NOT EXISTS user_predefined_goals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  predefined_goal_id INTEGER NOT NULL REFERENCES predefined_goals(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  progress JSONB DEFAULT '{}'::jsonb,
  UNIQUE (user_id, predefined_goal_id)
);

CREATE TABLE IF NOT EXISTS user_predefined_skill_status (
  id SERIAL PRIMARY KEY,
  user_predefined_goal_id INTEGER NOT NULL REFERENCES user_predefined_goals(id) ON DELETE CASCADE,
  predefined_skill_id INTEGER NOT NULL REFERENCES predefined_skills(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo','inprogress','done')),
  notes TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_predefined_goal_id, predefined_skill_id)
);

-- Kanban: user tasks copied from predefined_mini_projects (or created by user)
CREATE TABLE IF NOT EXISTS user_tasks (
  id SERIAL PRIMARY KEY,
  user_predefined_goal_id INTEGER NOT NULL REFERENCES user_predefined_goals(id) ON DELETE CASCADE,
  predefined_project_id INTEGER REFERENCES predefined_mini_projects(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo','inprogress','done','blocked')),
  difficulty TEXT CHECK (difficulty IN ('beginner','intermediate','advanced')) DEFAULT 'beginner',
  link TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_predefined_skills_goal ON predefined_skills(predefined_goal_id);
CREATE INDEX IF NOT EXISTS idx_predefined_edges_goal ON predefined_skill_edges(predefined_goal_id);
CREATE INDEX IF NOT EXISTS idx_predefined_resources_skill ON predefined_resources(skill_id);
CREATE INDEX IF NOT EXISTS idx_predefined_projects_skill ON predefined_mini_projects(skill_id);
CREATE INDEX IF NOT EXISTS idx_user_predefined_goals_user ON user_predefined_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_user_tasks_upg ON user_tasks(user_predefined_goal_id);

-- 1) add metadata column to user_tasks (JSONB)
ALTER TABLE user_tasks
  ADD COLUMN IF NOT EXISTS metadata JSONB;

-- 2) create a partial unique index to prevent duplicate source+sourceId for the same user_predefined_goal
CREATE UNIQUE INDEX IF NOT EXISTS user_tasks_unique_source
ON user_tasks (user_predefined_goal_id, (metadata->>'source'), (metadata->>'sourceId'))
WHERE (metadata IS NOT NULL AND (metadata->>'source') IS NOT NULL AND (metadata->>'sourceId') IS NOT NULL);

-- 3) (Optional) If you want to inspect duplicates created earlier:
-- show groups of duplicates (user_predefined_goal_id, source, sourceId) with count > 1
SELECT user_predefined_goal_id, metadata->>'source' AS source, metadata->>'sourceId' AS sourceId, COUNT(*) as cnt
FROM user_tasks
WHERE metadata IS NOT NULL AND (metadata->>'source') IS NOT NULL AND (metadata->>'sourceId') IS NOT NULL
GROUP BY user_predefined_goal_id, source, sourceId
HAVING COUNT(*) > 1;

-- create_user_selected_projects.sql
CREATE TABLE IF NOT EXISTS user_selected_projects (
  id SERIAL PRIMARY KEY,
  user_predefined_goal_id INTEGER NOT NULL REFERENCES user_predefined_goals(id) ON DELETE CASCADE,
  predefined_project_id INTEGER NOT NULL REFERENCES predefined_mini_projects(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (user_predefined_goal_id)
);
