import { type Handler, Hono } from "hono";
import type { WithSessionUserVariables } from "../../utils/sessionUserContext";
import { getContextUser } from "../../utils/sessionUserContext";
import { UsersService } from "../../utils/usersService";
import { db } from "../../../db/connect";

const usersRoutes = new Hono().basePath("/users");

const handleGetUserInfo: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const user = getContextUser(c);
  const usersService = new UsersService(db);
  const userInfo = await usersService.getUserInfo(user.id);
  return c.json(userInfo);
};
usersRoutes.get("/info", handleGetUserInfo);

export { usersRoutes };
