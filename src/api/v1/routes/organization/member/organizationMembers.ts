import { Hono } from "hono";

const organizationMembers = new Hono().basePath("/members");

organizationMembers.get("/", (c) => {
  return c.json({ message: "testing members" });
});

export { organizationMembers };
