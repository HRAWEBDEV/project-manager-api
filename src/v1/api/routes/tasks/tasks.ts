import { Hono } from "hono";

const tasksRoutes = new Hono().basePath("/tasks");

export { tasksRoutes };
