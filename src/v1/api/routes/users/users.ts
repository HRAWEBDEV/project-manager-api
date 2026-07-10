import { type Handler, Hono } from "hono";
import { StatusCodes } from "http-status-codes";
import { getApiErrorShape } from "../../utils/apiTypes";
import { insertUserSchema } from "../../../db/schemas/users";
import { insertOrganizationSchema } from "../../../db/schemas/organizations";
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

  return c.json({ message: "User signed up successfully" });
};

usersRoutes.post("/signup", handleUserSignup);

export { usersRoutes };
