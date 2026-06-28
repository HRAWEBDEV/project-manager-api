import type { Context } from "hono";
import { type WorkspaceRole } from "../../../../utils/autorization/workspace/workspacePermissions";

const WORKSPACE_ROLE = "organization-Role";

type WithWorkspaceROLE = {
  Variables: {
    [WORKSPACE_ROLE]: WorkspaceRole;
  };
};

function getWorkspaceRole(ctx: Context): WorkspaceRole {
  const role = ctx.get(WORKSPACE_ROLE);
  if (!role) throw new Error("workspace role not set");
  return role;
}

function isWorkspaceAdmin(ctx: Context): boolean {
  return getWorkspaceRole(ctx) === "admin";
}

function isWorkspaceMember(ctx: Context): boolean {
  return getWorkspaceRole(ctx) === "member";
}

function setWorkspaceRole(ctx: Context, role: WorkspaceRole): void {
  ctx.set(WORKSPACE_ROLE, role);
}

export type { WithWorkspaceROLE };

export {
  getWorkspaceRole,
  isWorkspaceAdmin,
  isWorkspaceMember,
  setWorkspaceRole,
};
