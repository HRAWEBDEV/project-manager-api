import { Hono } from "hono";

const authRoutes = new Hono().basePath("/auth");
// sign in
authRoutes.post("/sign-in", (c) => {
  return c.json({ "user": "signed in" });
});
// sing up
authRoutes.post("/sign-up", (c) => {
  return c.json({ "user": "signed up" });
});

export { authRoutes };
