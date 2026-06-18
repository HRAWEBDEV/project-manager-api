import { Hono } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { verifyPassword, checkMyPassword } from "./utils/passwordManager";
import { db } from "../../../../db/v1/connect";
import { users, insertUsersSchema } from "../../../../db/v1/schemas/users";
import { sessions } from "../../../../db/v1/schemas/sessions";
import { eq } from "drizzle-orm";
import { StatusCodes } from "http-status-codes";
import {
  SESSION_EXPIRE_MS,
  SESSION_NAME,
  generateToken,
  hashToken,
} from "./utils/sessionManager";
import { hashToken } from "./utils/sessionManager";

const authRoutes = new Hono().basePath("/auth");

authRoutes.post("/sign-in", async (c) => {
  const { phoneNumber, password } = (await c.req.json()) as {
    phoneNumber: string;
    password: string;
  };
  insertUsersSchema.pick({ phoneNumber: true }).parse({ phoneNumber });
  checkMyPassword(password);
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.phoneNumber, phoneNumber));
  if (!user) {
    c.status(StatusCodes.BAD_REQUEST);
    return c.json({ message: "sign in data is incorrect" });
  }
  if (!(await verifyPassword(password, user.hashedPassword))) {
    c.status(StatusCodes.BAD_REQUEST);
    return c.json({ message: "sign in data is incorrect" });
  }
  const userAgent = c.req.header("User-Agent") || null;
  const ipAddress = c.req.header("x-forwarded-for") || null;
  const token = generateToken();
  const hashedToken = await hashToken(token);
  const [createdSession] = await db
    .insert(sessions)
    .values({
      expiresAt: new Date(Date.now() + SESSION_EXPIRE_MS),
      ipAddress,
      userAgent,
      token: hashedToken,
      userId: user.id,
    })
    .returning();
  if (!createdSession) {
    throw new Error("Failed to create session");
  }
  setCookie(c, SESSION_NAME, token, {
    expires: createdSession.expiresAt,
    path: "/",
  });
  return c.json({ message: "sign in successful" });
});

authRoutes.post("/logout", async (c) => {
  const token = getCookie(c, SESSION_NAME);
  const successRes = { message: "logout successful" };
  if (!token) {
    return c.json(successRes);
  }
  const hashedToken = await hashToken(token);
  await db.delete(sessions).where(eq(sessions.token, hashedToken));
  deleteCookie(c, SESSION_NAME);
  return c.json(successRes);
});

export { authRoutes };
