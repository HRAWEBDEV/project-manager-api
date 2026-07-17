import { type Handler, Hono } from "hono";
import type { WithSessionUserVariables } from "../../utils/sessionUserContext";
import { getContextUser } from "../../utils/sessionUserContext";
import { getContextUserOrganizationMember } from "../../utils/userActiveOrganization";
import { WorkspacesService } from "../../services/workspacesService";
import { db } from "../../../db/connect";
import { checkUserPermission } from "../../middlewares/checkUserPermission";
import {
  insertWorkspaceSchema,
  updateWorkspaceSchema,
} from "../../../db/schemas/workspaces";
import { StatusCodes } from "http-status-codes";
import { getApiErrorShape } from "../../utils/apiTypes";
import { WorkspaceMembersService } from "../../services/workspaceMembersService";
import { getHeaderActiveWorkspace } from "../../utils/userActiveWorkspace";

const workspacesRoutes = new Hono().basePath("/workspaces");

const handleGetWorkspaces: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const organizationId = c.req.query("organization-id");
  const user = getContextUser(c);
  const workspaceService = new WorkspacesService(db);
  const workspacesResult = await workspaceService.getWorkspaces({
    filters: {
      organizationId,
      userId: user.id,
    },
  });
  return c.json({ workspaces: workspacesResult });
};
workspacesRoutes.get(
  "/",
  checkUserPermission({
    rolePermission: "workspace:read",
    type: "organization",
  }),
  handleGetWorkspaces,
);

const handleCreateWorkspace: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const user = getContextUser(c);
  const organizationMember = getContextUserOrganizationMember(c);
  const { name, description } = await c.req.json();
  const parsedWorkspace = insertWorkspaceSchema
    .pick({
      name: true,
      description: true,
    })
    .parse({ name, description });
  const createdWorkspace = await db.transaction(async (tx) => {
    const workspaceService = new WorkspacesService(tx);
    const workspaceMemberService = new WorkspaceMembersService(tx);
    const createdWorkspace = await workspaceService.createWorkspace({
      name: parsedWorkspace.name,
      description: parsedWorkspace.description,
      createdBy: user.id,
      organizationId: organizationMember.organizationId,
    });
    await workspaceMemberService.createWorkspaceMember({
      workspaceId: createdWorkspace!.id,
      organizationMemberId: organizationMember.id,
      role: "admin",
    });
    return createdWorkspace;
  });
  return c.json(createdWorkspace);
};

workspacesRoutes.post(
  "/",
  checkUserPermission({
    rolePermission: "workspace:create",
    type: "organization",
  }),
  handleCreateWorkspace,
);

const handleUpdateWorkspace: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const organizationMember = getContextUserOrganizationMember(c);
  const workspaceId = c.req.param("id");
  const { name, description } = await c.req.json();
  const parsedWorkspace = updateWorkspaceSchema
    .pick({
      name: true,
      description: true,
    })
    .parse({ name, description });
  const workspaceService = new WorkspacesService(db);
  const updatedWorkspace = await workspaceService.updateWorkspace({
    id: workspaceId!,
    name: parsedWorkspace.name,
    description: parsedWorkspace.description,
    organizationId: organizationMember.organizationId,
  });
  if (!updatedWorkspace) {
    c.status(StatusCodes.NOT_FOUND);
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.NOT_FOUND,
        message: "Workspace not found",
      }),
    );
  }
  return c.json(updatedWorkspace);
};

workspacesRoutes.patch(
  "/:id",
  checkUserPermission({
    rolePermission: "workspace:update",
    type: "organization",
  }),
  handleUpdateWorkspace,
);

const handleDeleteWorkspace: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const id = c.req.param("id");
  const organizatinMember = getContextUserOrganizationMember(c);
  const workspaceService = new WorkspacesService(db);
  const deletedWorkspace = await workspaceService.deleteWorkspace({
    organizationId: organizatinMember.organizationId,
    id: id!,
  });
  if (!deletedWorkspace) {
    c.status(StatusCodes.NOT_FOUND);
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.NOT_FOUND,
        message: "workspace not found",
      }),
    );
  }
  return c.json(deletedWorkspace);
};
workspacesRoutes.delete(
  "/:id",
  checkUserPermission({
    rolePermission: "workspace:delete",
    type: "organization",
  }),
  handleDeleteWorkspace,
);

// MEMBERS
const handleGetWorkspaceMembers: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const workspaceId = getHeaderActiveWorkspace(c);
  const workspaceMembersService = new WorkspaceMembersService(db);
  const workspaceMembers = await workspaceMembersService.getWorkspaceMembers({
    filters: {
      workspaceId: workspaceId!,
    },
  });
  return c.json({ workspaceMembers });
};

workspacesRoutes.get(
  "/members",
  checkUserPermission({
    rolePermission: "workspace_member:read",
    type: "organizationAndWorkspace",
  }),
  handleGetWorkspaceMembers,
);

const handleCreateWorkspaceMember: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const id = c.req.param("id");
  const organizationMember = getContextUserOrganizationMember(c);
  const workspaceId = getHeaderActiveWorkspace(c);
  const workspaceMembersService = new WorkspaceMembersService(db);
  const createWorkspace = await workspaceMembersService.createWorkspaceMember({
    organizationMemberId: id!,
    workspaceId: workspaceId!,
    addedBy: organizationMember.userId,
    role: "member",
  });
  return c.json(createWorkspace);
};

workspacesRoutes.post(
  "/members/:id",
  checkUserPermission({
    rolePermission: "workspace_member:create",
    type: "organization",
  }),
  handleCreateWorkspaceMember,
);

export { workspacesRoutes };
