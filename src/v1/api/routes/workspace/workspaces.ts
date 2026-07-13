import { type Handler, Hono } from "hono";
import type { WithSessionUserVariables } from "../../utils/sessionUserContext";
import { getContextUser } from "../../utils/sessionUserContext";
import { WorkspacesService } from "../../utils/workspacesService";
import { db } from "../../../db/connect";
import { checkUserPermission } from "../../middlewares/checkUserPermission";
import {
  insertWorkspaceSchema,
  updateWorkspaceSchema,
} from "../../../db/schemas/workspaces";
import { getHeaderActiveOrganization } from "../../utils/userActiveOrganization";
import { StatusCodes } from "http-status-codes";
import { getApiErrorShape } from "../../utils/apiTypes";

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
  const organizationId = getHeaderActiveOrganization(c);
  const { name, description } = await c.req.json();
  const parsedWorkspace = insertWorkspaceSchema
    .pick({
      name: true,
      description: true,
    })
    .parse({ name, description });
  const workspaceService = new WorkspacesService(db);
  const createdWorkspace = await workspaceService.createWorkspace({
    name: parsedWorkspace.name,
    description: parsedWorkspace.description,
    createdBy: user.id,
    organizationId: organizationId!,
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
  const organizationId = getHeaderActiveOrganization(c);
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
    organizationId: organizationId!,
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

export { workspacesRoutes };
