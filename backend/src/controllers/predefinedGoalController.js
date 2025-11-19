// src/controllers/predefinedGoalController.js
import * as model from "../models/predefinedGoalModel.js";

export const getPredefinedGoals = async (req, res) => {
  try {
    const goals = await model.listPredefinedGoals();
    return res.json({ ok: true, goals });
  } catch (err) {
    console.error("getPredefinedGoals", err);
    return res.status(500).json({ ok:false, error: "Server error" });
  }
};

export const getPredefinedRoadmap = async (req, res) => {
  try {
    const id = Number(req.params.predefinedGoalId);
    if (!id) return res.status(400).json({ ok:false, error: "Invalid id" });
    const roadmap = await model.getRoadmapByPredefinedGoalId(id);

    // create simple nodes (no layout util required; frontend can layout too)
    const nodes = roadmap.skills.map(s => ({
      id: s.id,
      key: s.key ?? `skill_${s.id}`,
      title: s.title,
      description: s.description,
      position: s.position,
      difficulty: s.difficulty,
      resources: roadmap.resources.filter(r => r.skill_id === s.id),
      mini_projects: roadmap.minis.filter(m => m.skill_id === s.id)
    }));
    const edges = roadmap.edges.map(e => ({ id: e.id, from: e.from_skill, to: e.to_skill, note: e.note }));
    return res.json({ ok: true, nodes, edges });
  } catch (err) {
    console.error("getPredefinedRoadmap", err);
    return res.status(500).json({ ok:false, error: "Server error" });
  }
};

/* user selects template */
export const postUserSelectPredefinedGoal = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (req.user?.userId !== userId) return res.status(403).json({ ok:false, error: "Forbidden" });

    const { predefinedGoalId } = req.body;
    if (!predefinedGoalId) return res.status(400).json({ ok:false, error: "predefinedGoalId required" });

    // create or get the user_predefined_goal record
    const upg = await model.addUserPredefinedGoal(userId, predefinedGoalId);

    // fetch suggested mini-projects (DO NOT insert them into user_tasks)
    const suggestedProjects = await model.getSuggestedProjectsForUserPredefinedGoal(predefinedGoalId);

    // Legacy/admin behavior — populate tasks only if explicitly requested via query param ?populate=true
    const populateFlag = String(req.query?.populate ?? "").toLowerCase();
    let populated = false;
    if (populateFlag === "1" || populateFlag === "true") {
      try {
        await model.createTasksFromTemplate(upg.id, predefinedGoalId);
        populated = true;
      } catch (err) {
        console.warn("createTasksFromTemplate (populate) failed:", err?.message ?? err);
      }
    }

    return res.status(201).json({
      ok: true,
      userPredefinedGoal: upg,
      suggestedProjects,
      populated,
    });
  } catch (err) {
    console.error("postUserSelectPredefinedGoal", err);
    return res.status(500).json({ ok:false, error: "Server error" });
  }
};

export const getUserPredefinedGoals = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (req.user?.userId !== userId) return res.status(403).json({ ok:false, error: "Forbidden" });
    const list = await model.listUserPredefinedGoals(userId);
    return res.json({ ok:true, userGoals: list });
  } catch (err) {
    console.error("getUserPredefinedGoals", err);
    return res.status(500).json({ ok:false, error: "Server error" });
  }
};

export const getUserPredefinedRoadmap = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (req.user?.userId !== userId) return res.status(403).json({ ok:false, error: "Forbidden" });
    const userPredefinedGoalId = Number(req.params.userPredefinedGoalId);
    if (!userPredefinedGoalId) return res.status(400).json({ ok:false, error: "userPredefinedGoalId required" });
    const roadmap = await model.getRoadmapForUserPredefinedGoal(userPredefinedGoalId);
    return res.json({ ok:true, nodes: roadmap.nodes, edges: roadmap.edges });
  } catch (err) {
    console.error("getUserPredefinedRoadmap", err);
    return res.status(500).json({ ok:false, error: "Server error" });
  }
};

export const getSuggestedProjectsForUserPredefinedGoal = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (req.user?.userId !== userId) return res.status(403).json({ ok:false, error: "Forbidden" });

    const userPredefinedGoalId = Number(req.params.userPredefinedGoalId);
    if (!userPredefinedGoalId) return res.status(400).json({ ok:false, error: "userPredefinedGoalId required" });

    // find predefined_goal_id
    const upg = await model.getRoadmapForUserPredefinedGoal
      ? null
      : null; // noop

    // Use model to find predefined_goal_id via DB (we'll call the model helper we added earlier)
    if (typeof model.getSuggestedProjectsForUserPredefinedGoal === "function") {
      const suggestions = await model.getSuggestedProjectsForUserPredefinedGoal(userPredefinedGoalId);
      return res.json({ ok: true, suggestions });
    }

    return res.status(500).json({ ok:false, error: "Suggestions not available on server" });
  } catch (err) {
    console.error("getSuggestedProjectsForUserPredefinedGoal", err);
    return res.status(500).json({ ok:false, error: "Server error" });
  }
};

/* GET progress for a user's selected predefined goal */
export const getProgressForUserPredefinedGoal = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (req.user?.userId !== userId) return res.status(403).json({ ok: false, error: "Forbidden" });

    const userPredefinedGoalId = Number(req.params.userPredefinedGoalId);
    if (!userPredefinedGoalId) return res.status(400).json({ ok: false, error: "userPredefinedGoalId required" });

    // ensure the UPG exists and belongs to this user
    const upg = await model.getUserPredefinedGoal(userPredefinedGoalId);
    if (!upg) return res.status(404).json({ ok: false, error: "user_predefined_goal not found" });
    if (upg.user_id !== userId) return res.status(403).json({ ok: false, error: "Forbidden" });

    const progress = await model.getProgressForUserPredefinedGoal(userPredefinedGoalId);
    return res.json({ ok: true, ...progress });
  } catch (err) {
    console.error("getProgressForUserPredefinedGoal", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};

/* POST select a final project for a user's selected goal (only if progress indicates 100%) */
export const postSelectProjectForUserPredefinedGoal = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (req.user?.userId !== userId) return res.status(403).json({ ok: false, error: "Forbidden" });

    const userPredefinedGoalId = Number(req.params.userPredefinedGoalId);
    if (!userPredefinedGoalId) return res.status(400).json({ ok: false, error: "userPredefinedGoalId required" });

    const { predefinedProjectId } = req.body;
    if (!predefinedProjectId) return res.status(400).json({ ok: false, error: "predefinedProjectId required" });

    // ensure UPG exists and belongs to user
    const upg = await model.getUserPredefinedGoal(userPredefinedGoalId);
    if (!upg) return res.status(404).json({ ok: false, error: "user_predefined_goal not found" });
    if (upg.user_id !== userId) return res.status(403).json({ ok: false, error: "Forbidden" });

    // fetch progress to compute percentage (prefer skills, otherwise tasks)
    const progress = await model.getProgressForUserPredefinedGoal(userPredefinedGoalId);

    // normalize fields
    const totalSkills = Number(progress?.totalSkills ?? progress?.total_skills ?? 0);
    const doneSkills = Number(progress?.doneSkills ?? progress?.done_skills ?? 0);
    const totalTasks = Number(progress?.totalTasks ?? progress?.total_tasks ?? 0);
    const doneTasks = Number(progress?.doneTasks ?? progress?.done_tasks ?? 0);

    // compute percent: prefer skills, else tasks
    let pct = 0;
    if (totalSkills > 0) pct = Math.round((doneTasks / totalSkills) * 100);
    else if (totalTasks > 0) pct = Math.round((doneTasks / totalSkills) * 100);

    // Accept selection only when percentage indicates completion (>= 100)
    if (pct < 100) {
      return res.status(400).json({
        ok: false,
        error: "All tasks/skills must be completed (100%) before selecting a project",
        progress: { totalTasks, doneTasks, totalSkills, doneSkills, percent: pct }
      });
    }

    // persist selection
    const result = await model.selectProjectForUserPredefinedGoal(userPredefinedGoalId, predefinedProjectId);

    // If your model returns the selection row and project row separately, adapt this return shape.
    return res.status(201).json({ ok: true, selected: result.selected ?? result, project: result.project ?? null });
  } catch (err) {
    console.error("postSelectProjectForUserPredefinedGoal", err);
    return res.status(500).json({ ok: false, error: "Server error" });
  }
};

export const getSelectedProjectForUserPredefinedGoal = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (req.user?.userId !== userId) return res.status(403).json({ ok: false, error: "Forbidden" });

    const userPredefinedGoalId = Number(req.params.userPredefinedGoalId);
    if (!userPredefinedGoalId) return res.status(400).json({ ok: false, error: "userPredefinedGoalId required" });

    // ensure UPG exists and belongs to this user
    const upg = await model.getUserPredefinedGoal(userPredefinedGoalId);
    if (!upg) return res.status(404).json({ ok: false, error: "user_predefined_goal not found" });
    if (upg.user_id !== userId) return res.status(403).json({ ok: false, error: "Forbidden" });

    const selected = await model.getSelectedProjectForUserPredefinedGoal(userPredefinedGoalId);
    if (!selected) return res.status(404).json({ ok: false, error: "no selected project" });

    // normalize response shape expected by frontend
    return res.json({
      ok: true,
      selected: {
        selection_id: selected.selection_id,
        predefined_project_id: selected.predefined_project_id,
        title: selected.title,
        description: selected.description,
        difficulty: selected.difficulty,
        link: selected.link
      }
    });
  } catch (err) {
    console.error("getSelectedProjectForUserPredefinedGoal", err);
    return res.status(500).json({ ok:false, error: "Server error" });
  }
};
