import type { MiddlewareHandler } from "hono";
import type { WithSessionVariables } from "../../../auth/utils/contextSessionVariables";
import { db } from "../../../../../../db/v1/connect";
import { workspaceMembers } from "../../../../../../db/v1/schemas/workspaceMembers";
import { eq, and } from "drizzle-orm";
import { getUser } from "../../../auth/utils/contextSessionVariables";
import { createMiddleware } from "hono/factory";
import { StatusCodes } from "http-status-codes";
import { getApiErrorShape } from "../../../../../../db/v1/utils/apiGeneralTypes";
import { setWorkspaceRole } from "../utils/contextWorkspaceRole";
import { getHeaderWorkspaceID } from "../utils/headerWorkspaceCredentials";

export const checkUserWorkspaceRole: MiddlewareHandler<{
  Variables: WithSessionVariables["Variables"];
}> = createMiddleware(async (c, next) => {
  const user = getUser(c);
  const activeWorkspace = getHeaderWorkspaceID(c);
  if (!activeWorkspace) {
    return c.json(
      getApiErrorShape({
        status: "failed",
        message: "workspace-id header is required",
        code: StatusCodes.BAD_REQUEST,
      }),
      StatusCodes.BAD_REQUEST,
    );
  }
  const [workspaceMember] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, activeWorkspace),
        eq(workspaceMembers.userId, user.id),
      ),
    )
    .limit(1);
  if (!workspaceMember) {
    return c.json(
      getApiErrorShape({
        status: "failed",
        message: "user is not a member of the workspace",
        code: StatusCodes.FORBIDDEN,
      }),
      StatusCodes.FORBIDDEN,
    );
  }
  setWorkspaceRole(c, workspaceMember.role);
  await next();
});
