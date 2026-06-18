import { Hono } from "hono";
import { secureHeaders } from "hono/secure-headers";
import { cors } from "hono/cors";
import { serveStatic } from "hono/bun";
import { logger } from "hono/logger";
import { testConnection, closeConnection } from "./src/db/v1/connect";
import { v1Routes } from "./src/api/v1/index.ts";

const app = new Hono();
const api = new Hono().basePath("/api");

api.route("/", v1Routes);
app.route("/", api);

// logger
app.use(logger());
// secure headers
app.use(secureHeaders());
// cors
app.use(
  cors({
    origin: "*",
    credentials: true,
  }),
);

// serve static files
app.use("static/*", serveStatic({ root: "./" }));
// test health
app.get("/healthy", (c) => {
  return c.json({ message: "hi :)" });
});

async function startApi() {
  try {
    const dbConnected = await testConnection();
    if (!dbConnected) {
      process.exit(1);
    }
    Bun.serve({
      fetch: app.fetch,
      port: process.env.PORT || 3000,
    });
    console.log(`api started on port ${process.env.PORT || 3000}`);
  } catch (err) {
    console.log(`failed to start api:${err}`);
    closeConnection();
    process.exit(1);
  }
}

process.on("SIGINT", async () => {
  await closeConnection();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  await closeConnection();
  process.exit(0);
});

startApi();
