import { drizzle } from "drizzle-orm/node-postgres";
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

export { db, pool, closeConnection, connectionOK };
