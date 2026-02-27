import { db } from "@src/db/connect.ts";
import { eq, or, SQL } from "drizzle-orm";
import { type Session, sessions } from "@src/db/v1/schemas/sessions.ts";
import { generateToken, hashToken } from "./token.ts";
import { type User, type UserInsert, users } from "@src/db/v1/schemas/users.ts";
import * as argon2 from "argon2";

const SESSION_EXPIRE_MS = 1000 * 60 * 60 * 24 * 7; // 7 days
const USER_EXISTS = "USER_EXISTS";
const INVALID_CREDENTIALS = "INVALID_CREDENTIALS";

class AuthService {
  constructor() {}

  static async signUp(
    { firstName, lastName, email, phoneNumber, password, ipAddress, userAgent }:
      & Pick<
        UserInsert,
        "firstName" | "lastName" | "email" | "phoneNumber"
      >
      & { password: string }
      & Pick<
        Session,
        "ipAddress" | "userAgent"
      >,
  ) {
    const existedUser = await db.select().from(users).where(
      or(eq(users.email, email), eq(users.phoneNumber, phoneNumber)),
    ).limit(1);
    if (existedUser.length) throw new Error(USER_EXISTS);

    const hashedPassword = await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });
    const newUser = await db.insert(users).values({
      firstName,
      lastName,
      email,
      phoneNumber,
      hashedPassword,
    }).returning();
    const { session, token } = await this.createSession({
      userId: newUser[0].id,
      ipAddress,
      userAgent,
    });

    return {
      user: newUser[0],
      session,
      token,
    };
  }

  static async signIn(
    credentials:
      & { password: string }
      & ({ email: User["email"] } | { phoneNumber: User["phoneNumber"] })
      & Pick<
        Session,
        "ipAddress" | "userAgent"
      >,
  ) {
    let where: null | SQL<unknown> = null;
    if ("phoneNumber" in credentials) {
      where = eq(users.phoneNumber, credentials.phoneNumber);
    } else {
      where = eq(users.email, credentials.email);
    }
    const foundUser = await db.select().from(users).where(where).limit(1);
    if (!foundUser.length) throw new Error(INVALID_CREDENTIALS);
    const validPassword = await argon2.verify(
      foundUser[0].hashedPassword,
      credentials.password,
    );
    if (!validPassword) throw new Error(INVALID_CREDENTIALS);
    const { session, token } = await this.createSession({
      userId: foundUser[0].id,
      ipAddress: credentials.ipAddress,
      userAgent: credentials.userAgent,
    });
    return { user: foundUser[0], session, token };
  }

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
    }).returning();
    return {
      session: session[0],
      token,
    };
  }
}

export { AuthService, INVALID_CREDENTIALS, USER_EXISTS };
