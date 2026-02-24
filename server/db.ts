import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export async function runMigrations() {
  const client = await pool.connect();
  try {
    const result = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'content' AND column_name = 'question'
    `);
    if (result.rows.length > 0) {
      console.log("Migrating content table from old schema to new schema...");
      await client.query(`DROP TABLE IF EXISTS content`);
      await client.query(`
        CREATE TABLE content (
          id SERIAL PRIMARY KEY,
          unit_id TEXT,
          topic TEXT NOT NULL,
          subtopic TEXT NOT NULL,
          search_context TEXT,
          keywords TEXT,
          key_takeaway TEXT,
          difficulty TEXT,
          use_case TEXT,
          timestamp_link TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);
      console.log("Content table migrated successfully.");
    }
  } catch (err) {
    console.error("Migration check error:", err);
  } finally {
    client.release();
  }
}
