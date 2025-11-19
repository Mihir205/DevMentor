// src/controllers/authController.js
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import * as userModel from "../models/userModel.js";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "devsecret";
const SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || "10", 10);

export const register = async (req, res) => {
  try {
    const { firstName, lastName, mobileNo, email, password } = req.body;
    if (!firstName || !email || !password) return res.status(400).json({ ok:false, error: "firstName, email and password are required" });

    const existing = await userModel.findUserByEmail(email);
    if (existing) return res.status(400).json({ ok:false, error: "Email already in use" });

    const hashed = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await userModel.createUser({
      firstName,
      lastName,
      email,
      hashedPassword: hashed,
      phone: mobileNo || null
    });

    // Build user object to return (omit password)
    const returnedUser = {
      id: user.id,
      first_name: user.first_name || user.name || firstName,
      last_name: user.last_name || null,
      email: user.email,
      phone: user.phone || mobileNo || null,
      // new admin flags (created users default to false)
      is_admin: Boolean(user.is_admin || false),
      isAdmin: Boolean(user.is_admin || false)
    };

    // Issue JWT (include isAdmin claim)
    const token = jwt.sign({ userId: user.id, email: user.email, isAdmin: returnedUser.isAdmin }, JWT_SECRET, { expiresIn: "7d" });

    return res.status(201).json({ ok: true, token, user: returnedUser });
  } catch (err) {
    console.error("register error:", err);
    return res.status(500).json({ ok:false, error: "Server error" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await userModel.findUserByEmail(email);
    if (!user) return res.status(400).json({ ok:false, error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ ok:false, error: "Invalid credentials" });

    // include isAdmin claim in token so client can read it immediately
    const isAdmin = Boolean(user.is_admin || false);
    const token = jwt.sign({ userId: user.id, email: user.email, isAdmin }, JWT_SECRET, { expiresIn: "7d" });

    // return user with admin flag
    const returnedUser = {
      id: user.id,
      first_name: user.first_name || user.name,
      last_name: user.last_name || null,
      email: user.email,
      phone: user.phone || null,
      is_admin: isAdmin,
      isAdmin: isAdmin
    };

    return res.json({ ok:true, token, user: returnedUser });
  } catch (err) {
    console.error("login error:", err);
    return res.status(500).json({ ok:false, error: "Server error" });
  }
};

export const getMe = async (req, res) => {
  try {
    // If you have auth middleware that attaches req.user, use it:
    if (req.user) {
      return res.json({ ok: true, user: req.user });
    }

    // Fallback: try to read token from Authorization header and fetch user
    const h = req.headers.authorization;
    if (!h || !h.startsWith("Bearer ")) return res.status(401).json({ ok:false, error: "Unauthorized" });
    const token = h.slice(7);
    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch (e) {
      return res.status(401).json({ ok:false, error: "Invalid token" });
    }

    const dbUser = await userModel.findUserById(payload.userId);
    if (!dbUser) return res.status(401).json({ ok:false, error: "User not found" });

    const returnedUser = {
      id: dbUser.id,
      first_name: dbUser.first_name || dbUser.name,
      last_name: dbUser.last_name || null,
      email: dbUser.email,
      phone: dbUser.phone || null,
      is_admin: Boolean(dbUser.is_admin || false),
      isAdmin: Boolean(dbUser.is_admin || false)
    };

    return res.json({ ok: true, user: returnedUser });
  } catch (err) {
    console.error("getMe error:", err);
    return res.status(500).json({ ok:false, error: "Server error" });
  }
};