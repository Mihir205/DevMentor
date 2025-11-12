// src/routes/userPredefinedGoalRoutes.js
import express from "express";
import { auth } from "../middleware/auth.js";
import {
  postUserSelectPredefinedGoal,
  getUserPredefinedGoals,
  getUserPredefinedRoadmap
} from "../controllers/predefinedGoalController.js";
import { getKanban, addTask, moveTask } from "../controllers/kanbanController.js";

const router = express.Router({ mergeParams: true });

// user selects a predefined goal
router.post("/:userId/predefined-goals", auth, postUserSelectPredefinedGoal);

// list user's selected templates
router.get("/:userId/predefined-goals", auth, getUserPredefinedGoals);

// user roadmap
router.get("/:userId/predefined-goals/:userPredefinedGoalId/roadmap", auth, getUserPredefinedRoadmap);

// kanban endpoints
router.get("/:userId/predefined-goals/:userPredefinedGoalId/kanban", auth, getKanban);
router.post("/:userId/predefined-goals/:userPredefinedGoalId/kanban/tasks", auth, addTask);
router.put("/:userId/tasks/:taskId/move", auth, moveTask);

export default router;
