import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const pool = new Pool({
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

export async function initDb(): Promise<void> {
  try {
    await pool.query(`
      ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS assessment_score INTEGER;
      ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS cert_score INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE freelancer_profiles ADD COLUMN IF NOT EXISTS rating_score INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE freelancer_certifications ADD COLUMN IF NOT EXISTS score INTEGER NOT NULL DEFAULT 0;
    `);
  } catch (err) {
    console.error("Database schema init error:", err);
  }
}