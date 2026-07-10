import { type DBExecuter } from "../../db/connect";
import { users, type InsertUser } from "../../db/schemas/users";
import * as argon2 from "argon2";

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

  private hashPassword(password: string) {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });
  }
  private verifyPassword(password: string, compareWith: string) {
    return argon2.verify(compareWith, password);
  }
}

export { UsersService };
