import { Context } from "hono";

const HEADER_ACTIVE_ORGANIZATION_NAME = "organization-id";
const CONTEXT_USER_ORGANIZATION_ROLE = "userOrganizationRole";

function getHeaderActiveOrganization(context: Context) {
  return context.req.header(HEADER_ACTIVE_ORGANIZATION_NAME);
}

function getContextUserOrganizationRole(context: Context) {
  const role = context.get(CONTEXT_USER_ORGANIZATION_ROLE);
  if (!role) throw new Error("User organization role not set");
  return role;
}

function setContextUserOrganizationRole(context: Context, role: string) {
  context.set(CONTEXT_USER_ORGANIZATION_ROLE, role);
}

export {
  getHeaderActiveOrganization,
  getContextUserOrganizationRole,
  setContextUserOrganizationRole,
  CONTEXT_USER_ORGANIZATION_ROLE,
};
