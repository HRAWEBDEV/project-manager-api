import { Hono } from "hono";
import { NotFoundError } from "../../db/v1/utils/NotFound.ts";
import { ZodError } from "zod";
import { ReasonPhrases, StatusCodes } from "http-status-codes";
import { getApiErrorShape } from "../../db/v1/utils/apiGeneralTypes.ts";
import { authRoutes } from "./routes/auth/auth.ts";
import { accountRoutes } from "./routes/account/account.ts";
import { workspacesRoutes } from "./routes/workspace/workspaces.ts";
import { boardsRoutes } from "./routes/board/boards.ts";
import { projectsRoutes } from "./routes/projects/projects.ts";
import { statusesRoutes } from "./routes/status/status.ts";
import { organizationRoutes } from "./routes/organization/organizations.ts";
import { DrizzleQueryError } from "drizzle-orm";
import { checkUserSession } from "./routes/auth/middlewares/checkUserSession.ts";

const v1Routes = new Hono().basePath("/v1");
v1Routes.route("/", authRoutes);
// protected routes
v1Routes.use(checkUserSession);
v1Routes.route("/", accountRoutes);
v1Routes.route("/", organizationRoutes);
v1Routes.route("/", workspacesRoutes);
v1Routes.route("/", projectsRoutes);
v1Routes.route("/", boardsRoutes);
v1Routes.route("/", statusesRoutes);

v1Routes.onError((err, c) => {
  if (err instanceof ZodError) {
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.BAD_REQUEST,
        message: err.message,
      }),
      StatusCodes.BAD_REQUEST,
    );
  }
  if (err instanceof NotFoundError) {
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.NOT_FOUND,
        message: err.message || ReasonPhrases.NOT_FOUND,
      }),
      StatusCodes.NOT_FOUND,
    );
  }
  if (
    err instanceof DrizzleQueryError &&
    process.env.NODE_ENV === "development"
  ) {
    if (
      err.cause &&
      "code" in err.cause &&
      "detail" in err.cause &&
      "table" in err.cause
    ) {
      if ((err.cause.code as string) == "23505") {
        return c.json(
          {
            ...getApiErrorShape({
              status: "failed",
              code: StatusCodes.BAD_REQUEST,
              message: "RESOURCE_ALREADY_EXISTS",
            }),
            detail: err.cause.detail,
            table: err.cause.table,
          },
          StatusCodes.BAD_REQUEST,
        );
      }
    }
  }
  console.log(err);
  return c.json(
    getApiErrorShape({
      status: "failed",
      code: StatusCodes.INTERNAL_SERVER_ERROR,
      message: ReasonPhrases.INTERNAL_SERVER_ERROR,
    }),
    StatusCodes.INTERNAL_SERVER_ERROR,
  );
});

export { v1Routes };
