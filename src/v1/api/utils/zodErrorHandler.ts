import type { Context } from "hono";
import type { ZodError } from "zod";
import { StatusCodes } from "http-status-codes";
import { getApiErrorShape } from "./apiTypes";
import z from "zod";

export function handleZodError(c: Context, err: ZodError) {
  c.status(StatusCodes.BAD_REQUEST);
  return c.json({
    ...getApiErrorShape({
      status: "failed",
      code: StatusCodes.BAD_REQUEST,
      message: "VALIDATION_ERROR",
    }),
    errors: z.treeifyError(err),
  });
}
