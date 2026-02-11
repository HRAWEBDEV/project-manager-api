import { Hono } from "hono";
const app = new Hono();

app.get("/", (c) => {
  return c.text("my first deno app");
});

Deno.serve(app.fetch);
