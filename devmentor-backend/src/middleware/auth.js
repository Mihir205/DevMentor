// src/middleware/auth.js  (example minimal)
import jwt from "jsonwebtoken";
import * as userModel from "../models/userModel.js";
const JWT_SECRET = process.env.JWT_SECRET || "devsecret";

export const auth = async (req, res, next) => {
  try {
    const h = req.headers.authorization;
    if (!h || !h.startsWith("Bearer ")) return res.status(401).json({ ok:false, error: "Unauthorized" });
    const token = h.slice(7);
    let payload;
    try { payload = jwt.verify(token, JWT_SECRET); } catch (e) { return res.status(401).json({ ok:false, error: "Invalid token" }); }

    // Attach a minimal user object (fresh from DB) so controllers can trust it
    const dbUser = await userModel.findUserById(payload.userId);
    if (!dbUser) return res.status(401).json({ ok:false, error: "User not found" });

    req.user = {
      userId: dbUser.id,
      email: dbUser.email,
      first_name: dbUser.first_name,
      last_name: dbUser.last_name,
      phone: dbUser.phone,
      isAdmin: Boolean(dbUser.is_admin || false),
      is_admin: Boolean(dbUser.is_admin || false)
    };
    next();
  } catch (err) {
    console.error("auth middleware error", err);
    return res.status(500).json({ ok:false, error: "Server error" });
  }
};
