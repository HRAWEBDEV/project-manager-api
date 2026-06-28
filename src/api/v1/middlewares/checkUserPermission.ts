import { createMiddleware } from "hono/factory";
import { getOrgRole } from "../routes/organization/member/utils/contextOrganizationRole";
import {
  type OrganizationRolePermissions,
  hasPermission,
} from "../utils/autorization/organization/organizationPermissions";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { getApiErrorShape } from "../../../db/v1/utils/apiGeneralTypes";

export const checkUserPermission = ({
  type,
  rolePermission,
}: {
  type: "workspace" | "organization" | "both";
  rolePermission: OrganizationRolePermissions;
}) => {
  return createMiddleware(async (c, next) => {
    let memeberHasPermission = false;
    if (type === "organization" || type === "both") {
      const orgRole = getOrgRole(c);
      memeberHasPermission = hasPermission(orgRole, rolePermission);
    }
    if (type === "workspace" || type === "both") {
    }
    if (!memeberHasPermission) {
      return c.json(
        getApiErrorShape({
          status: "failed",
          code: StatusCodes.FORBIDDEN,
          message: ReasonPhrases.FORBIDDEN,
        }),
        {
          status: StatusCodes.FORBIDDEN,
        },
      );
    }
    await next();
  });
};
