import { type Handler, Hono } from "hono";
import { StatusCodes } from "http-status-codes";
import { getApiErrorShape } from "../../utils/apiTypes";
import { insertUserSchema } from "../../../db/schemas/users";
import { insertOrganizationSchema } from "../../../db/schemas/organizations";
import { OrganizationMembersService } from "../../utils/organizationMembersService";
import { OrganizationsService } from "../../utils/organizationsService";
import { UsersService } from "../../utils/usersService";
import {
  SessionsService,
  getSessionCookie,
  setSessionCookie,
  deleteSessionCookie,
} from "../../utils/sessionsService";
import { getUserAgent, getUserIpAddress } from "../../utils/userHeaderInfo";
import { db } from "../../../db/connect";
import z from "zod";

const usersRoutes = new Hono().basePath("/users");

const handleUserSignup: Handler = async (c) => {
  const { user, organization } = await c.req.json();

  if (!user || !organization) {
    c.status(StatusCodes.BAD_REQUEST);
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.BAD_REQUEST,
        message: "User and organization info are required",
      }),
    );
  }

  const parsedUser = insertUserSchema
    .extend({
      password: z.string(),
    })
    .pick({
      username: true,
      email: true,
      phoneNumber: true,
      firstName: true,
      lastName: true,
      password: true,
    })
    .parse({
      ...user,
      password: user.password,
    });

  const parsedOrganization = insertOrganizationSchema
    .pick({
      name: true,
      description: true,
    })
    .parse(organization);
  const userAgent = getUserAgent(c);
  const ipAddress = getUserIpAddress(c);

  const createdSession = await db.transaction(async (tx) => {
    const usersService = new UsersService(tx);
    const organizationsService = new OrganizationsService(tx);
    const organizationMembersService = new OrganizationMembersService(tx);
    const sessionsService = new SessionsService(tx);
    const createdUser = await usersService.createUser(parsedUser);
    const createdOrganization =
      await organizationsService.createOrganization(parsedOrganization);
    await organizationMembersService.createMember({
      userId: createdUser!.id,
      organizationId: createdOrganization!.id,
      role: "admin",
    });
    const createdSession = await sessionsService.createSession({
      userId: createdUser!.id,
      ipAddress: ipAddress,
      userAgent: userAgent,
    });
    return createdSession!;
  });

  setSessionCookie({
    c,
    token: createdSession.token,
    expiresAt: createdSession.expiresAt,
  });
  c.status(StatusCodes.CREATED);
  return c.json({ message: "User signed up successfully" });
};

usersRoutes.post("/signup", handleUserSignup);

const handleUserSignin: Handler = async (c) => {
  const { username, password } = await c.req.json();
  const parsedUser = insertUserSchema
    .extend({
      password: z.string(),
    })
    .pick({
      username: true,
      password: true,
    })
    .parse({
      username,
      password,
    });
  const userService = new UsersService(db);
  const user = await userService.signInUserWithUsernamePassword({
    password: parsedUser.password,
    username: parsedUser.username,
  });
  if (!user) {
    c.status(StatusCodes.UNAUTHORIZED);
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.UNAUTHORIZED,
        message: "Invalid username or password",
      }),
    );
  }
  const userAgent = getUserAgent(c);
  const ipAddress = getUserIpAddress(c);
  const sessionService = new SessionsService(db);
  const createdSession = await sessionService.createSession({
    userId: user.id,
    ipAddress: ipAddress,
    userAgent: userAgent,
  });
  setSessionCookie({
    c,
    token: createdSession.token,
    expiresAt: createdSession.expiresAt,
  });
  return c.json({
    message: "User signed in successfully",
  });
};

usersRoutes.post("/sign-in", handleUserSignin);

const handleUserLogout: Handler = async (c) => {
  const token = getSessionCookie(c);
  if (token) {
    const sessionService = new SessionsService(db);
    await sessionService.revokeSession(token);
    deleteSessionCookie(c);
  }
  return c.json({
    message: "User logged out successfully",
  });
};

usersRoutes.post("logout", handleUserLogout);

export { usersRoutes };
