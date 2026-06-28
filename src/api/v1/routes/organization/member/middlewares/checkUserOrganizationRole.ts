import type { MiddlewareHandler } from "hono";
import type { WithSessionVariables } from "../../../auth/utils/contextSessionVariables";
import { db } from "../../../../../../db/v1/connect";
import { organizationMembers } from "../../../../../../db/v1/schemas/organizationMembers";
import { eq } from "drizzle-orm";
import { getUser } from "../../../auth/utils/contextSessionVariables";
import { createMiddleware } from "hono/factory";
import { StatusCodes } from "http-status-codes";
import { getApiErrorShape } from "../../../../../../db/v1/utils/apiGeneralTypes";

const checkUserSession: MiddlewareHandler<{
  Variables: WithSessionVariables["Variables"];
}> = createMiddleware(async (c, next) => {
  const user = getUser(c);

  await next();
});
