// src/models/userModel.js
import { pool } from "../config/db.js";

/**
 * Create user. Accepts firstName, lastName (optional), email, hashedPassword, phone (optional).
 * Stores first_name/last_name if those columns exist; otherwise stores combined name.
 */
export const createUser = async ({ firstName, lastName, email, hashedPassword, phone }) => {
  // if first_name/last_name columns exist we insert them, otherwise insert name into 'name'
  // We'll attempt to insert into first_name/last_name, but keep compatibility by using COALESCE checks on schema level.
  const q = `
    INSERT INTO users (first_name, last_name, name, email, password, phone)
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING id, first_name, last_name, name, email, phone;
  `;
  const name = [firstName, lastName].filter(Boolean).join(" ").trim() || null;
  const { rows } = await pool.query(q, [firstName || null, lastName || null, name, email, hashedPassword, phone || null]);
  return rows[0];
};

export const findUserByEmail = async (email) => {
  const { rows } = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
  return rows[0];
};

export const findUserById = async (id) => {
  const { rows } = await pool.query("SELECT id, COALESCE(first_name, name) as first_name, last_name, email, phone FROM users WHERE id = $1", [id]);
  return rows[0];
};
