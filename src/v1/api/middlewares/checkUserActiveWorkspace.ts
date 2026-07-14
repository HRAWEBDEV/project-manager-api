import { createMiddleware } from "hono/factory";
import { type MiddlewareHandler } from "hono";
import { type WithSessionUserVariables } from "../utils/sessionUserContext";
import { StatusCodes } from "http-status-codes";
import { getApiErrorShape } from "../utils/apiTypes";
import { db } from "../../db/connect";
import {
  getHeaderActiveWorkspace,
  setContextUserWorkspaceRole,
} from "../utils/userActiveWorkspace";
import { getContextUserOrganizationMember } from "../utils/userActiveOrganization";
import { WorkspaceMembersService } from "../services/workspaceMembersService";

export const checkUserActiveWorkspace: MiddlewareHandler<{
  Variables: WithSessionUserVariables["Variables"];
}> = createMiddleware(async (c, next) => {
  const activeWorkspaceId = getHeaderActiveWorkspace(c);
  const userOrganizationMember = getContextUserOrganizationMember(c);
  if (!activeWorkspaceId) {
    c.status(StatusCodes.BAD_REQUEST);
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.BAD_REQUEST,
        message: `Header workspace id is required`,
      }),
    );
  }
  if (userOrganizationMember.role === "owner") {
    setContextUserWorkspaceRole(c, "admin");
  } else {
    const workspaceMember = new WorkspaceMembersService(db);
    const member = await workspaceMember.getWorkspaceMember(
      activeWorkspaceId,
      userOrganizationMember.id,
    );
    if (!member) {
      c.status(StatusCodes.FORBIDDEN);
      return c.json(
        getApiErrorShape({
          status: "failed",
          code: StatusCodes.FORBIDDEN,
          message: `You are not a member of the workspace ${activeWorkspaceId}`,
        }),
      );
    }
    setContextUserWorkspaceRole(c, member.role);
  }
  await next();
});
