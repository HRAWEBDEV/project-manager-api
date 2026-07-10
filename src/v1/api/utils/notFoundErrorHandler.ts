import type { Context } from "hono";
import type { NotFoundError } from "./NotFound";
import { StatusCodes, ReasonPhrases } from "http-status-codes";

export function handleNotFoundError(c: Context, error: NotFoundError) {
  c.status(StatusCodes.NOT_FOUND);
  return c.json({
    status: "failed",
    code: StatusCodes.NOT_FOUND,
    message: error.message || ReasonPhrases.NOT_FOUND,
  });
}
