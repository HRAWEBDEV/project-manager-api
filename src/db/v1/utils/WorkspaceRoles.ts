const workspaceRoles = {
  OWNER: "owner",
  ADMIN: "admin",
  MEMBER: "member",
} as const;

type WorkspaceRole = (typeof workspaceRoles)[keyof typeof workspaceRoles];

export type { WorkspaceRole };
export { workspaceRoles };
