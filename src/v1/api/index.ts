import { DrizzleQueryError } from "drizzle-orm";
import { Hono } from "hono";
import { ZodError } from "zod";
import { NotFoundError } from "./utils/NotFound";
import { handleZodError } from "./utils/zodErrorHandler";
import { handleNotFoundError } from "./utils/notFoundErrorHandler";
import { handleDbError } from "./utils/dbErrorHandler";
import { handleInternalError } from "./utils/internalErrorlHandler";

const v1Routes = new Hono().basePath("/v1");

v1Routes.onError((err, c) => {
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
