import { createMiddleware } from "hono/factory";
import { type MiddlewareHandler } from "hono";
import { type WithSessionUserVariables } from "../utils/sessionUserContext";
import { getSessionCookie } from "../services/sessionsService";
import { getApiErrorShape } from "../utils/apiTypes";
import { ReasonPhrases, StatusCodes } from "http-status-codes";
import { SessionsService } from "../services/sessionsService";
import { db } from "../../db/connect";
import { setContextSession, setContextUser } from "../utils/sessionUserContext";

export const checkSessionUser: MiddlewareHandler<{
  Variables: WithSessionUserVariables["Variables"];
}> = createMiddleware(async (c, next) => {
  const token = getSessionCookie(c);
  if (!token)
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.UNAUTHORIZED,
        message: ReasonPhrases.UNAUTHORIZED,
      }),
      StatusCodes.UNAUTHORIZED,
    );
  const sessionService = new SessionsService(db);
  const sessionUser = await sessionService.getSessionUser(token);
  if (!sessionUser) {
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.UNAUTHORIZED,
        message: ReasonPhrases.UNAUTHORIZED,
      }),
      StatusCodes.UNAUTHORIZED,
    );
  }
  setContextUser(c, sessionUser.users);
  setContextSession(c, sessionUser.sessions);
  await next();
});
