import { type DBExecuter } from "../../db/connect";
import { users, type InsertUser } from "../../db/schemas/users";
import { organizations } from "../../db/schemas/organizations";
import { organizationMembers } from "../../db/schemas/organizationMembers";
import * as argon2 from "argon2";
import { and, eq } from "drizzle-orm";

class UsersService {
  constructor(private readonly db: DBExecuter) {}
  async createUser({
    firstName,
    lastName,
    email,
    username,
    phoneNumber,
    password,
    avatar,
  }: Pick<
    InsertUser,
    "firstName" | "lastName" | "email" | "username" | "phoneNumber" | "avatar"
  > & {
    password: string;
  }) {
    const hashedPassword = await this.hashPassword(password);
    const result = await this.db
      .insert(users)
      .values({
        firstName,
        lastName,
        email,
        username,
        phoneNumber,
        hashedPassword,
        avatar,
      })
      .returning({
        id: users.id,
      });
    return result[0];
  }

  async signInUserWithUsernamePassword({
    username,
    password,
  }: {
    username: string;
    password: string;
  }) {
    const [user] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.username, username)))
      .limit(1);
    if (!user) return null;
    const isPasswordValid = await this.verifyPassword(
      user.hashedPassword,
      password,
    );
    if (!isPasswordValid) return null;
    return user;
  }

  async getUserInfo(userId: string) {
    const [userInfo] = await this.db
      .select()
      .from(users)
      .leftJoin(organizationMembers, eq(users.id, organizationMembers.userId))
      .leftJoin(
        organizations,
        eq(organizationMembers.organizationId, organizations.id),
      )
      .where(eq(users.id, userId))
      .limit(1);
    if (!userInfo) return null;
    const { hashedPassword, ...publicUserInfo } = userInfo.users;

    return {
      user: publicUserInfo,
      organization: userInfo.organizations,
    };
  }

  private hashPassword(password: string) {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });
  }
  private verifyPassword(password: string, verifyPassword: string) {
    return argon2.verify(password, verifyPassword);
  }
}

export { UsersService };
