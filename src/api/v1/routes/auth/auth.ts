import { Hono } from "hono";

const authRoutes = new Hono().basePath("/auth");

authRoutes.post("/sign-in", (c) => {
  return c.json({ message: "hello there" });
});

export { authRoutes };
