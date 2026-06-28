import type { MiddlewareHandler } from "hono";
import type { WithSessionVariables } from "../../../auth/utils/contextSessionVariables";
import { db } from "../../../../../../db/v1/connect";
import { organizationMembers } from "../../../../../../db/v1/schemas/organizationMembers";
import { eq, and } from "drizzle-orm";
import { getUser } from "../../../auth/utils/contextSessionVariables";
import { createMiddleware } from "hono/factory";
import { StatusCodes } from "http-status-codes";
import { getApiErrorShape } from "../../../../../../db/v1/utils/apiGeneralTypes";
import { setOrgRole } from "../utils/contextOrganizationRole";
import { getHeaderOrganizationID } from "../utils/headerOrgCredentials";

export const checkUserOrganizationRole: MiddlewareHandler<{
  Variables: WithSessionVariables["Variables"];
}> = createMiddleware(async (c, next) => {
  const user = getUser(c);
  const activeOrganization = getHeaderOrganizationID(c);
  if (!activeOrganization) {
    return c.json(
      getApiErrorShape({
        status: "failed",
        message: "organization-id header is required",
        code: StatusCodes.BAD_REQUEST,
      }),
      StatusCodes.BAD_REQUEST,
    );
  }
  const [organizationMember] = await db
    .select()
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, activeOrganization),
        eq(organizationMembers.userId, user.id),
      ),
    )
    .limit(1);
  if (!organizationMember) {
    return c.json(
      getApiErrorShape({
        status: "failed",
        message: "user is not a member of the organization",
        code: StatusCodes.FORBIDDEN,
      }),
      StatusCodes.FORBIDDEN,
    );
  }
  setOrgRole(c, organizationMember.role);
  await next();
});
