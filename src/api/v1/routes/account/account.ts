import { Hono, type Handler } from "hono";
import { setCookie } from "hono/cookie";
import {
  type Organization,
  organizationInsertSchema,
  organizations,
} from "../../../../db/v1/schemas/organizations";
import {
  type User,
  insertUsersSchema,
  users,
} from "../../../../db/v1/schemas/users";
import { organizationMembers } from "../../../../db/v1/schemas/organizationMembers";
import { sessions } from "../../../../db/v1/schemas/sessions";
import { getApiErrorShape } from "../../../../db/v1/utils/apiGeneralTypes";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { db } from "../../../../db/v1/connect";
import { checkAndHashPassword } from "../auth/utils/passwordManager";
import {
  SESSION_EXPIRE_MS,
  SESSION_NAME,
  generateToken,
  hashToken,
} from "../auth/utils/sessionManager";
import { type WithSessionVariables } from "../auth/utils/contextSessionVaraibles";
import { cookieOptions } from "../../utils/cookieOptions";

const accountRoutes = new Hono().basePath("/account");

// for create a new account we get user and organization informatin and then a new user and a new organization will be created
const handleCreateAccount: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const { user, organization } = (await c.req.json()) as {
    user?: Pick<User, "firstName" | "lastName" | "email" | "phoneNumber"> & {
      password: string;
    };
    organization?: Pick<Organization, "name" | "email" | "address">;
  };
  if (!user || !organization) {
    c.status(StatusCodes.BAD_REQUEST);
    return c.json(
      getApiErrorShape({
        message: "FILL REQUIRED DATA, USER AND ORGANIZATION",
        code: StatusCodes.BAD_REQUEST,
        status: ReasonPhrases.BAD_REQUEST,
      }),
    );
  }
  insertUsersSchema
    .pick({
      firstName: true,
      lastName: true,
      email: true,
      phoneNumber: true,
    })
    .parse(user);
  organizationInsertSchema
    .pick({
      name: true,
      address: true,
      email: true,
    })
    .parse(organization);
  const userAgent = c.req.header("User-Agent") || null;
  const ipAddress = c.req.header("x-forwarded-for") || null;
  const hashedPassword = await checkAndHashPassword(user.password);
  const token = generateToken();
  const hashedToken = await hashToken(token);
  const [createdSession] = await db.transaction(async (tx) => {
    const [createdUser] = await tx
      .insert(users)
      .values({ ...user, hashedPassword: hashedPassword })
      .returning();

    const [createdOg] = await tx
      .insert(organizations)
      .values(organization)
      .returning();

    if (undefined === createdOg) {
      throw new Error("Failed to create organization");
    }
    if (undefined === createdUser) {
      throw new Error("Failed to create user");
    }

    const [createdMember] = await tx
      .insert(organizationMembers)
      .values({ userId: createdUser.id, organizationId: createdOg.id })
      .returning();

    const [createdSession] = await tx
      .insert(sessions)
      .values({
        userId: createdUser.id,
        userAgent,
        ipAddress,
        token: hashedToken,
        expiresAt: new Date(Date.now() + SESSION_EXPIRE_MS),
      })
      .returning();

    if (undefined === createdMember) {
      throw new Error("Failed to create member");
    }
    if (undefined === createdSession) {
      throw new Error("Failed to create session");
    }
    return [createdSession];
  });
  setCookie(c, SESSION_NAME, token, {
    expires: createdSession.expiresAt,
    ...cookieOptions,
  });
  return c.json({ message: "ACCOUNT CREATED" });
};

accountRoutes.post("/create", handleCreateAccount);

export { accountRoutes };
