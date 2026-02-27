import { Hono } from "hono";
import { NotFoundError } from "../../db/utils/NotFound.ts";
import { ZodError } from "zod";
import { ReasonPhrases, StatusCodes } from "http-status-codes";
import { getApiErrorShape } from "../../db/utils/apiGeneralTypes.ts";
import { authRoutes } from "./routes/auth/auto.ts";

const v1Routes = new Hono().basePath("/v1");
v1Routes.route("/", authRoutes);

v1Routes.onError((err, c) => {
  if (err instanceof ZodError) {
    return c.json(
      getApiErrorShape(
        {
          status: "failed",
          code: StatusCodes.BAD_REQUEST,
          message: err.message,
        },
      ),
      StatusCodes.BAD_REQUEST,
    );
  }
  if (err instanceof NotFoundError) {
    return c.json(
      getApiErrorShape(
        {
          status: "failed",
          code: StatusCodes.NOT_FOUND,
          message: ReasonPhrases.NOT_FOUND,
        },
      ),
      StatusCodes.NOT_FOUND,
    );
  }
  return c.json(
    getApiErrorShape(
      {
        status: "failed",
        code: StatusCodes.INTERNAL_SERVER_ERROR,
        message: ReasonPhrases.INTERNAL_SERVER_ERROR,
      },
    ),
    StatusCodes.INTERNAL_SERVER_ERROR,
  );
});

export { v1Routes };
