const organizationRoles = {
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
} as const;

const organizationRolesList = Object.values(organizationRoles);

type OrganizationRole =
  (typeof organizationRoles)[keyof typeof organizationRoles];

export type { OrganizationRole };
export { organizationRoles, organizationRolesList };
