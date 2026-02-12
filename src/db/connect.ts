import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const pool = new Pool({
  connectionString: Deno.env.get("DATABASE_URL")!,
});

const db = drizzle({ client: pool, casing: "snake_case" });

async function testConnection(): Promise<boolean> {
  try {
    const connection = await pool.connect();
    if (connection) {
      connection.release();
      return true;
    }
    return false;
  } catch (err) {
    console.log(`Error connecting to database: ${err}`);
    return false;
  }
}

async function closeConnection() {
  try {
    await pool.end();
    console.log("Database connection closed successfully");
  } catch (err) {
    console.log(`Error closing database connection: ${err}`);
    throw err;
  }
}

export { closeConnection, db, testConnection };
