import type { Context } from "hono";
import { type OrganizationRole } from "../../../../utils/autorization/organization/organizationPermissions";

const ORG_ROLE = "organization-Role";

type WithORGROLE = {
  Variables: {
    [ORG_ROLE]: OrganizationRole;
  };
};

function getOrgRole(ctx: Context): OrganizationRole {
  const role = ctx.get(ORG_ROLE);
  if (!role) throw new Error("Organization role not set");
  return role;
}

function isOrgOwner(ctx: Context): boolean {
  return getOrgRole(ctx) === "owner";
}

function isOrgAdmin(ctx: Context): boolean {
  return getOrgRole(ctx) === "admin";
}

function isOrgMember(ctx: Context): boolean {
  return getOrgRole(ctx) === "member";
}

function isOrgAdminOrOrgOwner(ctx: Context): boolean {
  return isOrgAdmin(ctx) || isOrgOwner(ctx);
}

function setOrgRole(ctx: Context, role: OrganizationRole): void {
  ctx.set(ORG_ROLE, role);
}

export type { WithORGROLE };

export {
  getOrgRole,
  setOrgRole,
  isOrgOwner,
  isOrgAdmin,
  isOrgMember,
  isOrgAdminOrOrgOwner,
};
