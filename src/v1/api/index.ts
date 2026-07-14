import { DrizzleQueryError } from "drizzle-orm";
import { Hono } from "hono";
import { ZodError } from "zod";
import { NotFoundError } from "./utils/NotFound";
import { handleZodError } from "./utils/zodErrorHandler";
import { handleNotFoundError } from "./utils/notFoundErrorHandler";
import { handleDbError } from "./utils/dbErrorHandler";
import { handleInternalError } from "./utils/internalErrorlHandler";
import { authRoutes } from "./routes/auth/auth";
import { usersRoutes } from "./routes/users/users";
import { checkSessionUser } from "./middlewares/checkSessionUser";
import { workspacesRoutes } from "./routes/workspace/workspaces";
import projectsRoutes from "./routes/projects/projects";
import { checkUserActiveOrganization } from "./middlewares/checkUserActiveOrganization";
import { checkUserActiveWorkspace } from "./middlewares/checkUserActiveWorkspace";

const v1Routes = new Hono().basePath("/v1");

v1Routes.route("/", authRoutes);
v1Routes.use(checkSessionUser);
v1Routes.route("/", usersRoutes);
//  active organization
v1Routes.use(checkUserActiveOrganization);
v1Routes.route("/", workspacesRoutes);
// active workspace
v1Routes.use(checkUserActiveWorkspace);
v1Routes.route("/", projectsRoutes);

v1Routes.onError((err, c) => {
  console.log(err);
  if (err instanceof ZodError) {
    return handleZodError(c, err);
  }
  if (err instanceof NotFoundError) {
    return handleNotFoundError(c, err);
  }
  if (err instanceof DrizzleQueryError) {
    return handleDbError(c, err);
  }
  // internal error
  return handleInternalError(c);
});

export { v1Routes };
