type OrganizationPermissions = typeof organizationPermissions;
type OrganizationRole = keyof OrganizationPermissions;
type OrganizationRolePermissions =
  OrganizationPermissions[keyof OrganizationPermissions][number];

const organizationPermissions = {
  owner: [
    "organization:update",
    "organization:delete",
    "workspace:read",
    "workspace:create",
    "workspace:update",
    "workspace:delete",
  ],
  admin: [
    "workspace:read",
    "workspace:create",
    "workspace:update",
    "workspace:delete",
  ],
  member: [],
} as const;

function hasPermission(
  role: OrganizationRole,
  permission: OrganizationRolePermissions,
): boolean {
  return (
    organizationPermissions[role] as readonly OrganizationRolePermissions[]
  ).includes(permission);
}

export type {
  OrganizationPermissions,
  OrganizationRole,
  OrganizationRolePermissions,
};
export { organizationPermissions, hasPermission };
