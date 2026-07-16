type OrganizationPermissions = typeof organizationPermissions;
type OrganizationRole = keyof OrganizationPermissions;
type OrganizationRolePermissions =
  OrganizationPermissions[keyof OrganizationPermissions][number];

const organizationPermissions = {
  owner: [
    "workspace:read",
    "workspace:create",
    "workspace:update",
    "workspace:delete",
    "project:read",
    "project:create",
    "project:update",
    "project:delete",
    "task:read",
    "task:create",
    "task:update",
    "task:delete",
    "board:read",
    "board:create",
    "board:update",
    "board:delete",
    "priority:read",
    "priority:create",
    "priority:update",
    "priority:delete",
    "status:read",
    "status:create",
    "status:update",
    "status:delete",
    "assignee:read",
    "assignee:create",
    "assignee:delete",
    "comment:read",
    "comment:create",
    "comment:update",
    "comment:delete",
    "organization_invitation:read",
    "organization_invitation:create",
    "organization_invitation:delete",
    "organization_member:read",
    "organization_member:update",
    "organization_member:delete",
    "workspace_member:read",
    "workspace_member:create",
    "workspace_member:update",
    "workspace_member:delete",
  ],
  admin: [
    "workspace:read",
    "workspace:create",
    "workspace:update",
    "workspace:delete",
    "organization_invitation:read",
    "organization_invitation:create",
    "organization_invitation:delete",
    "organization_member:read",
    "workspace_member:read",
    "workspace_member:create",
    "workspace_member:update",
    "workspace_member:delete",
  ],
  member: ["workspace:read"],
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
