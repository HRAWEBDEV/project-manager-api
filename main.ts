import { Hono } from "hono";
import { closeConnection, testConnection } from "./src/db/connect.ts";

const app = new Hono();

// Routes
app.get("/", (c) => {
  return c.html("<h1>Hello World from deno</h1>");
});

// Start server
const serverPort = parseInt(Deno.env.get("PORT") || "8000");

async function startServer() {
  try {
    const result = await testConnection();
    if (!result) {
      console.log("Failed to connect to database");
      Deno.exit(1);
    }
    Deno.serve(
      {
        port: serverPort,
      },
      app.fetch,
    );
  } catch (error) {
    console.log(`failed to start server ${error}`);
    Deno.exit(1);
  }
}
startServer();

Deno.addSignalListener("SIGINT", async () => {
  console.log(`shutting down ...`);
  await closeConnection();
  Deno.exit(0);
});
