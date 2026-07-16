import { type Handler, Hono } from "hono";
import type { WithSessionUserVariables } from "../../utils/sessionUserContext";
import { ProjectsService } from "../../services/projectsService";
import { ProjectMembersService } from "../../services/projectMembersService";
import { getContextUser } from "../../utils/sessionUserContext";
import { getHeaderActiveWorkspace } from "../../utils/userActiveWorkspace";
import { getContextUserOrganizationMember } from "../../utils/userActiveOrganization";
import { db } from "../../../db/connect";
import {
  insertProjectSchema,
  updateProjectSchema,
} from "../../../db/schemas/projects";
import { checkUserPermission } from "../../middlewares/checkUserPermission";
import { ar } from "zod/v4/locales";
import { StatusCodes } from "http-status-codes";
import { getApiErrorShape } from "../../utils/apiTypes";

const projectsRoutes = new Hono().basePath("/projects");

const handleGetProjects: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const user = getContextUser(c);
  const activeWorkspaceId = getHeaderActiveWorkspace(c);
  const projectsService = new ProjectsService(db);
  const projects = await projectsService.getProjects({
    filters: {
      userId: user.id,
      workspaceId: activeWorkspaceId!,
    },
  });
  return c.json({ projects });
};

projectsRoutes.get(
  "/",
  checkUserPermission({
    rolePermission: "project:read",
    type: "organizationAndWorkspace",
  }),
  handleGetProjects,
);

const handleCreateProject: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const user = getContextUser(c);
  const activeOrganizationMember = getContextUserOrganizationMember(c);
  const workspaceId = getHeaderActiveWorkspace(c);
  const { name, description, color, icon } = await c.req.json();
  const parsedProject = insertProjectSchema
    .pick({
      name: true,
      description: true,
      color: true,
      icon: true,
    })
    .parse({
      name,
      description,
      color,
      icon,
    });
  const createdProject = await db.transaction(async (tx) => {
    const projectService = new ProjectsService(tx);
    const projectMemberService = new ProjectMembersService(tx);
    const createdProject = await projectService.createProject({
      ...parsedProject,
      organizationId: activeOrganizationMember.organizationId,
      workspaceId: workspaceId!,
      createdBy: user.id,
    });
    await projectMemberService.createMember({
      organizationMemberId: activeOrganizationMember.id,
      projectId: createdProject!.id,
    });
    return createdProject;
  });
  return c.json(createdProject);
};

projectsRoutes.post(
  "/",
  checkUserPermission({
    rolePermission: "project:create",
    type: "organizationAndWorkspace",
  }),
  handleCreateProject,
);

const handleUpdateProject: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const id = c.req.param("id");
  const activeOrganizationMember = getContextUserOrganizationMember(c);
  const workspaceId = getHeaderActiveWorkspace(c);
  const { name, description, color, icon, archived } = await c.req.json();
  const parsedProject = updateProjectSchema
    .pick({
      name: true,
      description: true,
      color: true,
      icon: true,
      archived: true,
    })
    .parse({
      name,
      description,
      color,
      icon,
      archived,
    });
  const projectService = new ProjectsService(db);
  const updatedProject = await projectService.updateProject({
    organizationId: activeOrganizationMember.organizationId,
    workspaceId: workspaceId!,
    id: id!,
    ...parsedProject,
  });
  if (!updatedProject) {
    c.status(StatusCodes.NOT_FOUND);
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.NOT_FOUND,
        message: "Project not found",
      }),
    );
  }
  return c.json(updatedProject);
};

projectsRoutes.patch(
  "/:id",
  checkUserPermission({
    rolePermission: "project:update",
    type: "organizationAndWorkspace",
  }),
  handleUpdateProject,
);

const handleDeleteProject: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const id = c.req.param("id");
  const activeOrganizationMember = getContextUserOrganizationMember(c);
  const workspaceId = getHeaderActiveWorkspace(c);
  const projectService = new ProjectsService(db);
  const deletedProject = await projectService.deleteProject({
    organizationId: activeOrganizationMember.organizationId,
    workspaceId: workspaceId!,
    id: id!,
  });
  if (!deletedProject) {
    c.status(StatusCodes.NOT_FOUND);
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.NOT_FOUND,
        message: "Project not found",
      }),
    );
  }
  return c.json(deletedProject);
};

projectsRoutes.delete(
  "/:id",
  checkUserPermission({
    rolePermission: "project:delete",
    type: "organizationAndWorkspace",
  }),
  handleDeleteProject,
);

export default projectsRoutes;
