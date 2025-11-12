// src/controllers/kanbanController.js
import * as kanbanModel from "../models/kanbanModel.js";

export const getKanban = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (req.user?.userId !== userId) return res.status(403).json({ ok:false, error: "Forbidden" });
    const userPredefinedGoalId = Number(req.params.userPredefinedGoalId);
    if (!userPredefinedGoalId) return res.status(400).json({ ok:false, error: "userPredefinedGoalId required" });
    const kanban = await kanbanModel.getKanbanForUserPredefinedGoal(userPredefinedGoalId);
    return res.json({ ok:true, kanban });
  } catch (err) {
    console.error("getKanban", err);
    return res.status(500).json({ ok:false, error: "Server error" });
  }
};

export const addTask = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (req.user?.userId !== userId) return res.status(403).json({ ok:false, error: "Forbidden" });
    const userPredefinedGoalId = Number(req.params.userPredefinedGoalId);
    const { title, description, difficulty, link } = req.body;
    if (!title || !userPredefinedGoalId) return res.status(400).json({ ok:false, error: "required" });
    const task = await kanbanModel.createUserTask({ userPredefinedGoalId, title, description, difficulty, link });
    return res.status(201).json({ ok:true, task });
  } catch (err) {
    console.error("addTask", err);
    return res.status(500).json({ ok:false, error: "Server error" });
  }
};

export const moveTask = async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    if (req.user?.userId !== userId) return res.status(403).json({ ok:false, error: "Forbidden" });
    const taskId = Number(req.params.taskId);
    const { status } = req.body;
    if (!taskId || !status) return res.status(400).json({ ok:false, error: "taskId and status required" });
    const updated = await kanbanModel.updateUserTaskStatus(taskId, status);
    return res.json({ ok:true, task: updated });
  } catch (err) {
    console.error("moveTask", err);
    return res.status(500).json({ ok:false, error: err.message || "Server error" });
  }
};
