import { createMiddleware } from "hono/factory";
import { getOrgRole } from "../routes/organization/member/utils/contextOrganizationRole";
import { getWorkspaceRole } from "../routes/workspace/member/utils/contextWorkspaceRole";
import {
  type OrganizationRolePermissions,
  hasPermission,
} from "../utils/autorization/organization/organizationPermissions";
import {
  type WorkspaceRolePermissions,
  hasPermission as hasWorkspacePermission,
} from "../utils/autorization/workspace/workspacePermissions";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { getApiErrorShape } from "../../../db/v1/utils/apiGeneralTypes";

export const checkUserPermission = ({
  type,
  rolePermission,
}:
  | {
      type: "organization";
      rolePermission: OrganizationRolePermissions;
    }
  | {
      type: "workspace";
      rolePermission: WorkspaceRolePermissions;
    }
  | {
      type: "organizationAndWorkspace";
      rolePermission: Extract<
        OrganizationRolePermissions,
        WorkspaceRolePermissions
      >;
    }) => {
  return createMiddleware(async (c, next) => {
    let memeberHasPermission = false;
    if (type === "organization" || type === "organizationAndWorkspace") {
      const orgRole = getOrgRole(c);
      memeberHasPermission = hasPermission(orgRole, rolePermission);
    }
    if (
      !memeberHasPermission &&
      (type === "workspace" || type === "organizationAndWorkspace")
    ) {
      const workspaceRole = getWorkspaceRole(c);
      memeberHasPermission = hasWorkspacePermission(
        workspaceRole,
        rolePermission,
      );
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
