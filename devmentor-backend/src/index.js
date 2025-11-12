// src/index.js
import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
dotenv.config();

import authRoutes from "./routes/authRoutes.js";
import predefinedGoalRoutes from "./routes/predefinedGoalRoutes.js";
import userPredefinedGoalRoutes from "./routes/userPredefinedGoalRoutes.js";

const app = express();
app.use(cors());
app.use(bodyParser.json());

// routes
app.use("/api/auth", authRoutes);
app.use("/api/predefined-goals", predefinedGoalRoutes);
app.use("/api/users", userPredefinedGoalRoutes);

// health
app.get("/", (req, res) => res.json({ ok: true, msg: "DevMentor API (guided-only)" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server listening on port ${PORT}`));
