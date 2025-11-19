// src/routes/adminRoutes.js
import express from "express";
import { auth } from "../middleware/auth.js";
import { listUsers, getUser } from "../controllers/adminController.js";

const router = express.Router();

// All admin routes require auth; controller checks admin flag
router.get("/users", auth, listUsers); // GET /api/admin/users
router.get("/users/:userId", auth, getUser); // GET /api/admin/users/:userId

export default router;
