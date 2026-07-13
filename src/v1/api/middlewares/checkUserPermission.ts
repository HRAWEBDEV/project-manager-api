import { createMiddleware } from "hono/factory";
import { getContextUserOrganizationRole } from "../utils/userActiveOrganization";
import { getContextUserWorkspaceRole } from "../utils/userActiveWorkspace";
import {
  type OrganizationRolePermissions,
  hasPermission,
} from "../utils/organizationPermissions";
import {
  type WorkspaceRolePermissions,
  hasPermission as hasWorkspacePermission,
} from "../utils/workspacePermissions";
import { StatusCodes, ReasonPhrases } from "http-status-codes";
import { getApiErrorShape } from "../utils/apiTypes";

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
      const orgRole = getContextUserOrganizationRole(c);
      memeberHasPermission = hasPermission(orgRole, rolePermission);
    }
    if (
      !memeberHasPermission &&
      (type === "workspace" || type === "organizationAndWorkspace")
    ) {
      const workspaceRole = getContextUserWorkspaceRole(c);
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
