import type { ExtractTablesWithRelations } from "drizzle-orm";
import { drizzle, type NodePgQueryResultHKT } from "drizzle-orm/node-postgres";
import type { PgTransaction } from "drizzle-orm/pg-core";
import { Pool } from "pg";

if (!process.env.DATABASE_URL!) {
  throw new Error("DATABASE_URL is not defined");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 20,
});
const db = drizzle({
  client: pool,
  casing: "snake_case",
});

async function connectionOK(): Promise<boolean> {
  try {
    await pool.query("SELECT 1");
    return true;
  } catch (err) {
    console.log(`Error connecting to database: ${err}`);
    return false;
  }
}

async function closeConnection() {
  await pool.end();
}

type DBExecuter =
  | typeof db
  | PgTransaction<
      NodePgQueryResultHKT,
      Record<string, never>,
      ExtractTablesWithRelations<Record<string, never>>
    >;

export type { DBExecuter };
export { db, pool, closeConnection, connectionOK };
