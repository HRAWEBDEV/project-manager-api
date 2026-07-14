import { Context } from "hono";
import { type OrganizationMember } from "../../db/schemas/organizationMembers";

const HEADER_ACTIVE_ORGANIZATION_NAME = "organization-id";
const CONTEXT_USER_ORGANIZATION_MEMBER = "userOrganizationMember";

function getHeaderActiveOrganization(c: Context) {
  return c.req.header(HEADER_ACTIVE_ORGANIZATION_NAME);
}

function getContextUserOrganizationMember(c: Context) {
  const member = c.get(CONTEXT_USER_ORGANIZATION_MEMBER);
  if (!member) throw new Error("User organization member not set");
  return member as OrganizationMember;
}

function setContextUserOrganizationMember(
  c: Context,
  member: OrganizationMember,
) {
  c.set(CONTEXT_USER_ORGANIZATION_MEMBER, member);
}

export {
  getHeaderActiveOrganization,
  getContextUserOrganizationMember,
  setContextUserOrganizationMember,
  CONTEXT_USER_ORGANIZATION_MEMBER,
};
