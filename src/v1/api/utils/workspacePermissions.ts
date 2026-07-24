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
    "workspace_member:read",
    "project_member:read",
    "project_member:create",
    "project_member:update",
    "project_member:delete",
    "task_assignee:read",
    "task_assignee:update",
    "task_checklist:read",
    "task_checklist:update",
    "tag:read",
    "tag:create",
    "tag:update",
    "tag:delete",
  ],
  member: [
    "workspace:read",
    "project:read",
    "task:read",
    "task:create",
    "task:update",
    "task:delete",
    "assignee:read",
    "assignee:create",
    "assignee:delete",
    "comment:read",
    "comment:create",
    "comment:update",
    "comment:delete",
    "workspace_member:read",
    "project_member:read",
    "task_assignee:read",
    "task_assignee:update",
    "task_checklist:read",
    "task_checklist:update",
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
