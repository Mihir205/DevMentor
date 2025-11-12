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

    const upg = await model.addUserPredefinedGoal(userId, predefinedGoalId);
    // populate tasks
    await model.createTasksFromTemplate(upg.id, predefinedGoalId).catch(err => console.warn("createTasksFromTemplate", err.message));
    return res.json({ ok: true, userPredefinedGoal: upg });
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
