import { Hono } from "hono";
import { router as organizationsRouter } from "./routes/organizations.ts";
import { NotFoundError } from "../../db/utils/NotFound.ts";
import { ZodError } from "zod";

const v1Routes = new Hono().basePath("/v1");
v1Routes.route("/", organizationsRouter);

v1Routes.onError((err, c) => {
  if (err instanceof ZodError) {
    return c.json({ status: "failed", message: err.message }, 400);
  }
  if (err instanceof NotFoundError) {
    return c.json({ status: "failed", message: err.message }, 404);
  }
  return c.json({ status: "failed", message: "Something went wrong" }, 500);
});

export { v1Routes };
