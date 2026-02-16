import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { closeConnection, testConnection } from "@src/db/connect.ts";
import { v1Routes } from "@src/api/v1/index.ts";

const app = new Hono();
const api = new Hono().basePath("/api");
//
// app.use(secureHeaders());
// Routes
api.route("/", v1Routes);
app.route("/", api);

// Start server
const serverPort = parseInt(Deno.env.get("PORT") || "8000");

async function startServer() {
  try {
    const result = await testConnection();
    if (!result) {
      console.log("Failed to start application");
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
