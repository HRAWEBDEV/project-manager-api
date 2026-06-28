import { Hono } from "hono";

const organizationMembers = new Hono().basePath("/members");

export { organizationMembers };
