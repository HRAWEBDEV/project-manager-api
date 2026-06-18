import { createMiddleware } from "hono/factory";
import { getCookie } from "Hono/cookie";
import { db } from "../../../../../db/v1/connect";
import { sessions } from "../../../../../db/v1/schemas/sessions";
import { users } from "../../../../../db/v1/schemas/users";
import { eq, and, gt } from "drizzle-orm";
import { hashToken } from "../utils/sessionManager";
import { SESSION_NAME } from "../utils/sessionManager";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { getApiErrorShape } from "../../../../../db/v1/utils/apiGeneralTypes";

const checkUserSession = createMiddleware(async (c, next) => {
  const userSession = getCookie(c, SESSION_NAME);
  if (!userSession)
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.UNAUTHORIZED,
        message: ReasonPhrases.UNAUTHORIZED,
      }),
      StatusCodes.UNAUTHORIZED,
    );
  const hashedToken = await hashToken(userSession);
  const session = await db
    .select()
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(eq(sessions.token, hashedToken), gt(sessions.expiresAt, new Date())),
    );
  if (!session || !session[0]) {
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.UNAUTHORIZED,
        message: ReasonPhrases.UNAUTHORIZED,
      }),
      StatusCodes.UNAUTHORIZED,
    );
  }
  c.set("session", session[0].sessions);
  c.set("user", session[0].users);
  await next();
});

export { checkUserSession };
