import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import {
  AuthService,
  INVALID_CREDENTIALS,
  USER_EXISTS,
} from "./AuthService.ts";
import { StatusCodes } from "http-status-codes";
import { getApiErrorShape } from "../../../../db/utils/apiGeneralTypes.ts";

const cookieSessionName = "session_tokin";

function getSessionOptions(expiresAt: Date) {
  return {
    expires: expiresAt,
  } as const;
}

const authRoutes = new Hono().basePath("/auth");
// sign in
authRoutes.post("/sign-in", async (c) => {
  const { email, phoneNumber, password } = await c.req
    .json();
  const userAgent = c.req.header("User-Agent") || null;
  const ipAddress = c.req.header("x-forwarded-for") || null;
  try {
    const { token, session } = await AuthService.signIn({
      email,
      ipAddress,
      password,
      phoneNumber,
      userAgent,
    });
    setCookie(
      c,
      cookieSessionName,
      token,
      getSessionOptions(session.expiresAt),
    );
    return c.json({ message: "users signed-in" });
  } catch (err) {
    if (err instanceof Error && err.message === INVALID_CREDENTIALS) {
      c.status(StatusCodes.UNAUTHORIZED);
      return c.json(getApiErrorShape({
        status: "failed",
        code: StatusCodes.UNAUTHORIZED,
        message: INVALID_CREDENTIALS,
      }));
    }
    throw err;
  }
});
// sing up
authRoutes.post("/sign-up", async (c) => {
  const { firstName, lastName, password, email, phoneNumber } = await c.req
    .json();
  const userAgent = c.req.header("User-Agent") || null;
  const ipAddress = c.req.header("x-forwarded-for") || null;
  try {
    await AuthService.signUp({
      email,
      firstName,
      ipAddress,
      lastName,
      password,
      phoneNumber,
      userAgent,
    });

    return c.json({ message: "users signed-up in" });
  } catch (err) {
    if (err instanceof Error) {
      switch (err.message) {
        case INVALID_CREDENTIALS:
          c.status(StatusCodes.UNAUTHORIZED);
          return c.json(getApiErrorShape({
            status: "failed",
            code: StatusCodes.UNAUTHORIZED,
            message: INVALID_CREDENTIALS,
          }));
        case USER_EXISTS:
          c.status(StatusCodes.CONFLICT);
          return c.json(getApiErrorShape({
            status: "failed",
            code: StatusCodes.CONFLICT,
            message: USER_EXISTS,
          }));
      }
    }
    throw err;
  }
});

export { authRoutes };
