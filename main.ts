import { Hono } from "hono";

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

Deno.serve(
  {
    port: 8080,
  },
  app.fetch,
);
