import { db } from "@src/db/connect.ts";
import { type Session, sessions } from "@src/db/v1/schemas/sessions.ts";
import { generateToken, hashToken } from "./token.ts";

const SESSION_EXPIRE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

export class AuthService {
  constructor() {}

  private static async createSession(
    { userId, ipAddress, userAgent }: Pick<
      Session,
      "userId" | "ipAddress" | "userAgent"
    >,
  ) {
    const token = generateToken();
    const hashedToken = await hashToken(token);
    const expireDate = new Date(Date.now() + SESSION_EXPIRE_MS);
    const session = await db.insert(sessions).values({
      userId,
      expiresAt: expireDate,
      ipAddress,
      userAgent,
      hashedToken,
    }).returning({
      id: sessions.id,
      userId: sessions.userId,
      expiresAt: sessions.expiresAt,
    });
    return {
      ...session[0],
      token,
    };
  }
}
