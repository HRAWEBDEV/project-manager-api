import { Hono } from "hono";
import { router as organizationsRouter } from "./routes/organizations.ts";

const v1Routes = new Hono().basePath("/v1");
v1Routes.route("/", organizationsRouter);

export { v1Routes };
