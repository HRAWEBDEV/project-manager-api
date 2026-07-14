import { Hono } from "hono";

const projectsRoutes = new Hono().basePath("/projects");

export default projectsRoutes;
