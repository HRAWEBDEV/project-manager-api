import { type DBExecuter } from "../../db/connect";
import { users, type InsertUser, type User } from "../../db/schemas/users";
import { organizations } from "../../db/schemas/organizations";
import { organizationMembers } from "../../db/schemas/organizationMembers";
import * as argon2 from "argon2";
import { and, eq, ilike, inArray, sql } from "drizzle-orm";

class UsersService {
  constructor(private readonly db: DBExecuter) {}
  async getUsers({
    filters,
    paging,
  }: {
    filters: {
      userId?: string;
      ids?: string[];
      active?: boolean;
      email?: string;
      username?: string;
    };
    paging?: {
      page: number;
      pageSize: number;
    };
  }) {
    const filterConditions = [];
    if (filters.userId) {
      filterConditions.push(eq(users.id, filters.userId));
    }
    if (filters.ids) {
      filterConditions.push(inArray(users.id, filters.ids));
    }
    if (filters.active !== undefined) {
      filterConditions.push(eq(users.active, filters.active));
    }
    if (filters.email) {
      filterConditions.push(eq(users.email, `${filters.email}%`));
    }
    if (filters.username) {
      filterConditions.push(eq(users.username, `${filters.username}%`));
    }
    const whereClause = filterConditions.length
      ? and(...filterConditions)
      : undefined;

    let baseQuery = this.db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        avatar: users.avatar,
        active: users.active,
      })
      .from(users)
      .where(whereClause)
      .$dynamic();
    baseQuery = baseQuery.orderBy(users.createdAt);
    if (filters.userId) {
      baseQuery = baseQuery.limit(1);
    } else if (paging) {
      baseQuery = baseQuery
        .limit(paging.pageSize)
        .offset((paging.page - 1) * paging.pageSize);
    }
    const [usersResult, totalResult] = await Promise.all([
      baseQuery,
      this.db
        .select({ total: sql<number>`count(*)::int` })
        .from(users)
        .where(whereClause),
    ]);
    return { users: usersResult, total: totalResult[0]?.total ?? 0 };
  }
  async getUser({
    filters,
  }: {
    filters: {
      userId: string;
      active?: boolean;
    };
  }) {
    return (await this.getUsers({ filters })).users[0];
  }
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

  async updateUser({
    id,
    firstName,
    lastName,
    email,
    username,
    phoneNumber,
    avatar,
  }: Pick<User, "id"> &
    Partial<
      Pick<
        InsertUser,
        | "firstName"
        | "lastName"
        | "email"
        | "username"
        | "phoneNumber"
        | "avatar"
      >
    >) {
    const [updatedUser] = await this.db
      .update(users)
      .set({
        firstName,
        lastName,
        email,
        username,
        phoneNumber,
        avatar,
      })
      .where(eq(users.id, id))
      .returning({
        id: users.id,
      });
    return updatedUser;
  }
  async isUsernameAvailable(username: string) {
    const [existingUser] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    return !existingUser;
  }

  async isEmailAvailable(email: string) {
    const [existingUser] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return !existingUser;
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
