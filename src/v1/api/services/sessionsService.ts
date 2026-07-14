import { randomBytes, subtle } from "crypto";
import { type DBExecuter } from "../../db/connect";
import { type InsertSession, sessions } from "../../db/schemas/sessions";
import { users } from "../../db/schemas/users";
import { and, eq, gt, lt } from "drizzle-orm";
import type { Context } from "hono";
import { setCookie, deleteCookie, getCookie } from "hono/cookie";

const SESSION_NAME = "user_session";

class SessionsService {
  private static SESSION_EXPIRE_MS = 1000 * 60 * 60 * 24; // one day;
  constructor(private readonly db: DBExecuter) {}
  async createSession({
    userId,
    userAgent,
    deviceName,
    ipAddress,
  }: Pick<InsertSession, "deviceName" | "ipAddress" | "userAgent" | "userId">) {
    const token = this.generateToken();
    const hashedToken = await this.hashToken(token);
    const expiresAt = new Date(Date.now() + SessionsService.SESSION_EXPIRE_MS);
    await this.db.insert(sessions).values({
      userId,
      token: hashedToken,
      userAgent,
      deviceName,
      ipAddress,
      expiresAt,
    });
    return { token, expiresAt };
  }
  async validateSession(token: string) {
    const hashedToken = await this.hashToken(token);
    const [session] = await this.db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.token, hashedToken),
          gt(sessions.expiresAt, new Date()),
        ),
      )
      .limit(1);
    if (!session) return null;
    return { hashedToken };
  }
  async refreshSession(token: string) {
    const hashedToken = await this.hashToken(token);
    const expiresAt = new Date(Date.now() + SessionsService.SESSION_EXPIRE_MS);
    await this.db
      .update(sessions)
      .set({
        expiresAt,
      })
      .where(eq(sessions.token, hashedToken));
    return { expiresAt };
  }
  async getSessionUser(token: string) {
    const hashedToken = await this.hashToken(token);
    const [sessionUser] = await this.db
      .select()
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(eq(sessions.token, hashedToken))
      .limit(1);
    return sessionUser || null;
  }
  async revokeSession(token: string) {
    const hashedToken = await this.hashToken(token);
    await this.db.delete(sessions).where(eq(sessions.token, hashedToken));
  }
  async revokeUserSessions(userId: string) {
    await this.db.delete(sessions).where(eq(sessions.userId, userId));
  }
  async deleteExpiredSessions() {
    await this.db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
  }
  private generateToken() {
    return randomBytes(32).toString("hex");
  }
  private async hashToken(token: string) {
    const data = new TextEncoder().encode(token);
    const hash = await subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
}

function setSessionCookie({
  c,
  token,
  expiresAt,
}: {
  c: Context;
  token: string;
  expiresAt: Date;
}) {
  setCookie(c, SESSION_NAME, token, {
    path: "/",
    expires: expiresAt,
  });
}

function getSessionCookie(c: Context) {
  return getCookie(c, SESSION_NAME);
}

function deleteSessionCookie(c: Context) {
  deleteCookie(c, SESSION_NAME);
}

export {
  SESSION_NAME,
  SessionsService,
  setSessionCookie,
  deleteSessionCookie,
  getSessionCookie,
};
