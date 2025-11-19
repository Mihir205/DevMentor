// src/controllers/adminController.js
import * as model from "../models/adminModel.js";

/**
 * Middleware helper: ensure req.user exists and is admin.
 * We assume `auth` has attached `req.user`.
 */
const ensureAdmin = (req) => {
  if (!req.user) throw { status: 403, message: "Forbidden" };
  // support either boolean flag or role string
  const isAdmin = Boolean(req.user.isAdmin) || (req.user.role && String(req.user.role).toLowerCase() === "admin");
  if (!isAdmin) throw { status: 403, message: "Forbidden" };
};

export const listUsers = async (req, res) => {
  try {
    ensureAdmin(req);
    const limit = Number(req.query.limit ?? 50);
    const offset = Number(req.query.offset ?? 0);
    const users = await model.listUsersWithSelectedGoals({ limit, offset });
    return res.json({ ok: true, users });
  } catch (err) {
    console.error("admin.listUsers", err);
    const status = err?.status || 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "Server error" });
  }
};

export const getUser = async (req, res) => {
  try {
    ensureAdmin(req);
    const userId = Number(req.params.userId);
    if (!userId) return res.status(400).json({ ok: false, error: "userId required" });
    const user = await model.getUserWithSelectedGoals(userId);
    if (!user) return res.status(404).json({ ok: false, error: "User not found" });
    return res.json({ ok: true, user });
  } catch (err) {
    console.error("admin.getUser", err);
    const status = err?.status || 500;
    return res.status(status).json({ ok: false, error: err?.message ?? "Server error" });
  }
};
