import { Context } from "hono";
import { type WorkspaceRole } from "./workspacePermissions";

const HEADER_ACTIVE_WORKSPACE_NAME = "workspace-id";
const CONTEXT_USER_WORKSPACE_ROLE = "userWorkspaceRole";

function getHeaderActiveWorkspace(c: Context) {
  return c.req.header(HEADER_ACTIVE_WORKSPACE_NAME);
}

function getContextUserWorkspaceRole(c: Context) {
  const role = c.get(CONTEXT_USER_WORKSPACE_ROLE);
  if (!role) throw new Error("User workspace role not set");
  return role as WorkspaceRole;
}

function setContextUserWorkspaceRole(c: Context, role: WorkspaceRole) {
  c.set(CONTEXT_USER_WORKSPACE_ROLE, role);
}

export {
  CONTEXT_USER_WORKSPACE_ROLE,
  getHeaderActiveWorkspace,
  getContextUserWorkspaceRole,
  setContextUserWorkspaceRole,
};
