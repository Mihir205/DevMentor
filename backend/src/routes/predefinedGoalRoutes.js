// src/routes/predefinedGoalRoutes.js
import express from "express";
import { getPredefinedGoals, getPredefinedRoadmap } from "../controllers/predefinedGoalController.js";

const router = express.Router();
router.get("/", getPredefinedGoals);
router.get("/:predefinedGoalId/roadmap", getPredefinedRoadmap);
export default router;
