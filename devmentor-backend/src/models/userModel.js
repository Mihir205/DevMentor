// src/models/userModel.js
import { pool } from "../config/db.js";

/**
 * Create user. Accepts firstName, lastName (optional), email, hashedPassword, phone (optional).
 * Stores first_name/last_name if those columns exist; otherwise stores combined name.
 */
export const createUser = async ({ firstName, lastName, email, hashedPassword, phone }) => {
  const q = `
    INSERT INTO users (first_name, last_name, name, email, password, phone, is_admin)
    VALUES ($1,$2,$3,$4,$5,$6, false)
    RETURNING id, first_name, last_name, name, email, phone, is_admin;
  `;
  const name = [firstName, lastName].filter(Boolean).join(" ").trim() || null;
  const { rows } = await pool.query(q, [firstName || null, lastName || null, name, email, hashedPassword, phone || null]);
  return rows[0];
};

export const findUserByEmail = async (email) => {
  const q = `
    SELECT id, first_name, last_name, name, email, password, phone, is_admin
    FROM users
    WHERE email = $1
    LIMIT 1;
  `;
  const { rows } = await pool.query(q, [email]);
  return rows[0] ?? null;
};

export const findUserById = async (id) => {
  const q = `
    SELECT id,
           COALESCE(first_name, name) AS first_name,
           last_name,
           email,
           phone,
           is_admin
    FROM users
    WHERE id = $1
    LIMIT 1;
  `;
  const { rows } = await pool.query(q, [id]);
  return rows[0] ?? null;
};
