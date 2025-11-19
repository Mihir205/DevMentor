// src/routes/authRoutes.js
import express from "express";
import { register, login, getMe } from "../controllers/authController.js";
import { auth } from "../middleware/auth.js"; // <-- import middleware (NOT from controller)

const router = express.Router();

router.post("/register", register);
router.post("/login", login);

// Protect /me so only requests with a valid token can access it
router.get("/me", auth, getMe);

export default router;
