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
      console.log("Migrating content table: removing old 'question' column, adding new columns...");
      await client.query(`ALTER TABLE content DROP COLUMN IF EXISTS question`);
      await client.query(`ALTER TABLE content ADD COLUMN IF NOT EXISTS unit_id TEXT`);
      await client.query(`ALTER TABLE content ADD COLUMN IF NOT EXISTS search_context TEXT`);
      await client.query(`ALTER TABLE content ADD COLUMN IF NOT EXISTS keywords TEXT`);
      await client.query(`ALTER TABLE content ADD COLUMN IF NOT EXISTS key_takeaway TEXT`);
      await client.query(`ALTER TABLE content ADD COLUMN IF NOT EXISTS difficulty TEXT`);
      await client.query(`ALTER TABLE content ADD COLUMN IF NOT EXISTS use_case TEXT`);
      await client.query(`ALTER TABLE content ADD COLUMN IF NOT EXISTS timestamp_link TEXT`);
      console.log("Content table migrated successfully.");
    }
    // Add topic_label_pt column if missing
    const ptCol = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'content' AND column_name = 'topic_label_pt'
    `);
    if (ptCol.rows.length === 0) {
      await client.query(`ALTER TABLE content ADD COLUMN IF NOT EXISTS topic_label_pt TEXT`);
      console.log("Added topic_label_pt column to content table.");
    }
  } catch (err) {
    console.error("Migration check error:", err);
  } finally {
    client.release();
  }
}
