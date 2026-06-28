type WorkspacePermissions = typeof workspacePermissions;
type WorkspaceRole = keyof WorkspacePermissions;
type WorkspaceRolePermissions =
  WorkspacePermissions[keyof WorkspacePermissions][number];

const workspacePermissions = {
  admin: [
    "workspace:read",
    "project:read",
    "project:create",
    "project:update",
    "project:delete",
    "task:read",
    "task:create",
    "task:update",
    "task:delete",
  ],
  member: [
    "workspace:read",
    "project:read",
    "task:read",
    "task:create",
    "task:update",
    "task:delete",
  ],
} as const;

function hasPermission(
  role: WorkspaceRole,
  permission: WorkspaceRolePermissions,
): boolean {
  return (
    workspacePermissions[role] as readonly WorkspaceRolePermissions[]
  ).includes(permission);
}

export type { WorkspacePermissions, WorkspaceRole, WorkspaceRolePermissions };
export { workspacePermissions, hasPermission };
