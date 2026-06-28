type OrganizationPermissions = typeof organizationPermissions;
type OrganizationRole = keyof OrganizationPermissions;
type OrganizationRolePermissions<T extends OrganizationRole> =
  OrganizationPermissions[T][number];

const organizationPermissions = {
  owner: [
    "organization:update",
    "organization:delete",
    "workspace:create",
    "task:create",
  ],
  admin: ["workspace:create", "task:create"],
  member: ["task:create"],
} as const;

function hasPermission<T extends OrganizationRole>(
  role: T,
  permission: OrganizationRolePermissions<T>,
): boolean {
  return (
    organizationPermissions[role] as readonly OrganizationRolePermissions<T>[]
  ).includes(permission);
}

export type {
  OrganizationPermissions,
  OrganizationRole,
  OrganizationRolePermissions,
};
export { organizationPermissions, hasPermission };
