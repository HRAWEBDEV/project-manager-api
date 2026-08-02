import { type Handler, Hono } from "hono";
import type { WithSessionUserVariables } from "../../utils/sessionUserContext";
import { ProjectMembersService } from "../../services/projectMembersService";
import { insertProjectMemberSchema } from "../../../db/schemas/projectMembers";
import { getContextUser } from "../../utils/sessionUserContext";
import { getHeaderActiveWorkspace } from "../../utils/userActiveWorkspace";
import { getContextUserOrganizationMember } from "../../utils/userActiveOrganization";
import { db } from "../../../db/connect";
import {
  insertProjectSchema,
  updateProjectSchema,
} from "../../../db/schemas/projects";
import { checkUserPermission } from "../../middlewares/checkUserPermission";
import { StatusCodes } from "http-status-codes";
import { getApiErrorShape } from "../../utils/apiTypes";
import { ProjectIconService } from "../../utils/projectIconService";
import { ProjectsService } from "../../services/projectsService";
import {
  ImageTooLargeError,
  InvalidImageTypeError,
} from "../../utils/staticImagesService";
import { ProjectActivityService } from "../../services/projectActivityServices";
import z from "zod";
import { eventBus } from "../../utils/eventBus";

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
    const projectActivityService = new ProjectActivityService(tx);
    const createdProject = await projectService.createProject({
      ...parsedProject,
      organizationId: activeOrganizationMember.organizationId,
      workspaceId: workspaceId!,
      createdBy: user.id,
    });
    await projectMemberService.createMember({
      organizationMemberIds: [activeOrganizationMember.id],
      projectId: createdProject!.id,
    });
    const activity = await projectActivityService.createProjectActivity({
      projectId: createdProject!.id,
      organizationMembersId: activeOrganizationMember.id,
      action: {
        type: "created",
      },
    });
    if (activity) {
      eventBus.emit(activity.type, activity);
    }
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
  const updatedProject = await db.transaction(async (tx) => {
    const projectService = new ProjectsService(tx);
    const projectActivities = new ProjectActivityService(tx);
    const oldProject = await projectService.getProject({
      filters: {
        projectId: id!,
        userId: activeOrganizationMember.userId,
        workspaceId: workspaceId!,
      },
    });
    const updatedProject = await projectService.updateProject({
      organizationId: activeOrganizationMember.organizationId,
      workspaceId: workspaceId!,
      id: id!,
      ...parsedProject,
    });
    if (oldProject) {
      const activity = await projectActivities.createProjectActivity({
        organizationMembersId: activeOrganizationMember.id,
        projectId: id!,
        action: {
          type: "updated",
          meta: {
            oldProject: oldProject,
            newProject: parsedProject,
          },
        },
      });
      if (activity) {
        eventBus.emit(activity.type, activity);
      }
    }
    return updatedProject;
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

const handleUpdateProjectIcon: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const user = getContextUser(c);
  const projectId = c.req.param("id");
  const parseBody = await c.req.parseBody();
  const image = parseBody.image;
  const workspaceId = getHeaderActiveWorkspace(c);
  const organizationMember = getContextUserOrganizationMember(c);
  const projectService = new ProjectsService(db);
  if (!(image instanceof File)) {
    c.status(StatusCodes.BAD_REQUEST);
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.BAD_REQUEST,
        message: "Image is not a file",
      }),
    );
  }
  const url = new URL(c.req.url);
  const baseUrl = url.origin;
  try {
    const project = await projectService.getProject({
      filters: {
        userId: user.id,
        workspaceId: workspaceId!,
        projectId: projectId!,
      },
    });
    const [updatedProject, logoUrl] = await db.transaction(async (tx) => {
      const projectIconService = new ProjectIconService();
      const projectService = new ProjectsService(tx);
      const projectActivities = new ProjectActivityService(tx);
      const logoUrl = await projectIconService.saveStaticImage(image);
      const updatedProject = await projectService.updateProject({
        id: projectId!,
        organizationId: organizationMember.organizationId,
        workspaceId: workspaceId!,
        icon: logoUrl,
      });
      if (project?.icon) {
        projectIconService.deleteStaticImage(project.icon);
      }
      const activity = await projectActivities.createProjectActivity({
        projectId: projectId!,
        organizationMembersId: organizationMember.id,
        action: {
          type: "updated",
          meta: {
            oldProject: {
              icon: project?.icon,
            },
            newProject: {
              icon: logoUrl,
            },
          },
        },
      });
      if (activity) {
        eventBus.emit(activity.type, activity);
      }
      return [updatedProject, logoUrl];
    });
    return c.json({
      message: "icon updated successfully",
      avatarUrl: `${baseUrl}${logoUrl}`,
      projectId: updatedProject ? updatedProject.id : null,
    });
  } catch (err) {
    if (
      err instanceof InvalidImageTypeError ||
      err instanceof ImageTooLargeError
    ) {
      c.status(StatusCodes.BAD_REQUEST);
      return c.json(
        getApiErrorShape({
          status: "failed",
          code: StatusCodes.BAD_REQUEST,
          message: err.message,
        }),
      );
    }
    throw err;
  }
};

projectsRoutes.post(
  "/:id/icon",
  checkUserPermission({
    type: "organizationAndWorkspace",
    rolePermission: "project:update",
  }),
  handleUpdateProjectIcon,
);

const handleDeleteProject: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const id = c.req.param("id");
  const activeOrganizationMember = getContextUserOrganizationMember(c);
  const workspaceId = getHeaderActiveWorkspace(c);
  const deletedProject = await db.transaction(async (tx) => {
    const projectService = new ProjectsService(tx);
    const projectActivityService = new ProjectActivityService(tx);
    const deletedProject = await projectService.deleteProject({
      organizationId: activeOrganizationMember.organizationId,
      workspaceId: workspaceId!,
      id: id!,
    });
    const activity = await projectActivityService.createProjectActivity({
      projectId: deletedProject?.id!,
      organizationMembersId: activeOrganizationMember.id,
      action: {
        type: "deleted",
      },
    });
    if (activity) {
      eventBus.emit(activity.type, activity);
    }
    return deletedProject;
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

// members
const handleGetProjectMembers: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const workspaceId = getHeaderActiveWorkspace(c);
  const projectId = c.req.param("id");
  const projectMemberService = new ProjectMembersService(db);
  const projectMembers = await projectMemberService.getProjectMembers({
    filters: {
      projectId: projectId!,
      workspaceId: workspaceId!,
    },
  });
  return c.json({ projectMembers });
};

projectsRoutes.get(
  "/:id/members",
  checkUserPermission({
    rolePermission: "project_member:read",
    type: "organizationAndWorkspace",
  }),
  handleGetProjectMembers,
);

const handleCreateProjectMember: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const user = getContextUser(c);
  const organizationMember = getContextUserOrganizationMember(c);
  const projectId = c.req.param("id");
  const { organizationMemberId } = await c.req.json();
  const schema = insertProjectMemberSchema.shape.organizationMemberId;
  const parsedBody = schema.or(z.array(schema)).parse(organizationMemberId);
  const createdMember = await db.transaction(async (tx) => {
    const projectMemberService = new ProjectMembersService(tx);
    const projectActivityService = new ProjectActivityService(tx);
    const organizationMemberIds = Array.isArray(parsedBody)
      ? parsedBody
      : [parsedBody];
    const createdMember = await projectMemberService.createMember({
      addedBy: user.id,
      organizationMemberIds,
      projectId: projectId!,
    });
    const activity = await projectActivityService.createProjectActivity({
      projectId: projectId!,
      organizationMembersId: organizationMember.id,
      action: {
        type: "member_added",
        meta: {
          organizationMemberIds,
        },
      },
    });
    if (activity) {
      eventBus.emit(activity.type, activity);
    }
    return createdMember;
  });
  return c.json(createdMember);
};

projectsRoutes.post(
  "/:id/members",
  checkUserPermission({
    rolePermission: "project_member:create",
    type: "organizationAndWorkspace",
  }),
  handleCreateProjectMember,
);

const handleDeleteProjectMember: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const organizationMember = getContextUserOrganizationMember(c);
  const projectId = c.req.param("projectId");
  const id = c.req.param("id");
  const deletedMember = await db.transaction(async (tx) => {
    const projectMemberService = new ProjectMembersService(tx);
    const projectActivityService = new ProjectActivityService(tx);
    const deletedMember = await projectMemberService.deleteProjectMember(
      id!,
      projectId!,
    );
    const activity = await projectActivityService.createProjectActivity({
      projectId: projectId!,
      organizationMembersId: organizationMember.id,
      action: {
        type: "member_removed",
        meta: {
          organizationMemberIds: [deletedMember?.id!],
        },
      },
    });
    if (activity) {
      eventBus.emit(activity.type, activity);
    }
    return deletedMember;
  });
  if (!deletedMember) {
    c.status(StatusCodes.NOT_FOUND);
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.NOT_FOUND,
        message: "Project member not found",
      }),
    );
  }
  return c.json(deletedMember);
};

projectsRoutes.delete(
  "/:projectId/members/:id",
  checkUserPermission({
    rolePermission: "project_member:delete",
    type: "organizationAndWorkspace",
  }),
  handleDeleteProjectMember,
);

export default projectsRoutes;
