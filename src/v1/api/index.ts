import { DrizzleQueryError } from "drizzle-orm";
import { Hono } from "hono";
import { ReasonPhrases, StatusCodes } from "http-status-codes";
import { ZodError } from "zod";
import { getApiErrorShape } from "./utils/apiTypes";
import { NotFoundError } from "./utils/NotFound";

const v1Routes = new Hono().basePath("/v1");

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
