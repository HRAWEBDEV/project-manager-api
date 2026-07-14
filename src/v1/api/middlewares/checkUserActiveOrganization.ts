import { createMiddleware } from "hono/factory";
import { type MiddlewareHandler } from "hono";
import { type WithSessionUserVariables } from "../utils/sessionUserContext";
import { OrganizationMembersService } from "../services/organizationMembersService";
import {
  getHeaderActiveOrganization,
  setContextUserOrganizationMember,
} from "../utils/userActiveOrganization";
import { StatusCodes } from "http-status-codes";
import { getApiErrorShape } from "../utils/apiTypes";
import { db } from "../../db/connect";
import { getContextUser } from "../utils/sessionUserContext";

export const checkUserActiveOrganization: MiddlewareHandler<{
  Variables: WithSessionUserVariables["Variables"];
}> = createMiddleware(async (c, next) => {
  const user = getContextUser(c);
  const activeOrganizationId = getHeaderActiveOrganization(c);
  if (!activeOrganizationId) {
    c.status(StatusCodes.BAD_REQUEST);
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.BAD_REQUEST,
        message: `Header organization id is required`,
      }),
    );
  }
  const organizationMember = new OrganizationMembersService(db);
  const member = await organizationMember.getOrganizationMember(
    activeOrganizationId,
    user.id,
  );
  if (!member) {
    c.status(StatusCodes.FORBIDDEN);
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.FORBIDDEN,
        message: `You are not a member of the organization ${activeOrganizationId}`,
      }),
    );
  }
  setContextUserOrganizationMember(c, member);
  await next();
});
