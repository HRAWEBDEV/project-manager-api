import { Hono } from "hono";
import { load } from "@std/dotenv";

// Load enviroment variables
await load({
  export: true,
});

const app = new Hono();
// Middleware
app.use(async (_, next) => {
  console.log("middleware");
  await next();
});

// Routes
app.get("/", (c) => {
  return c.html("<h1>Hello World</h1>");
});

// Start server
const serverPort = parseInt(Deno.env.get("PORT") || "8000");
Deno.serve(
  {
    port: serverPort,
  },
  app.fetch,
);
