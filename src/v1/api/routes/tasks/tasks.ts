import { type Handler, Hono } from "hono";
import type { WithSessionUserVariables } from "../../utils/sessionUserContext";
import { TasksService } from "../../services/tasksService";
import { checkUserPermission } from "../../middlewares/checkUserPermission";
import { getContextUser } from "../../utils/sessionUserContext";
import {
  getContextUserWorkspaceRole,
  getHeaderActiveWorkspace,
} from "../../utils/userActiveWorkspace";
import { db } from "../../../db/connect";
import { createTaskSchema, updateTaskSchema } from "../../../db/schemas/tasks";
import { StatusCodes } from "http-status-codes";
import { getApiErrorShape } from "../../utils/apiTypes";
import { TaskAssigneesServices } from "../../services/taskAssigneesServices";
import { TaskChecklistsServices } from "../../services/taskChecklistsServices";
import { ProjectsService } from "../../services/projectsService";
import { insertTaskAssignee } from "../../../db/schemas/taskAssignees";
import { insertTasksChecklists } from "../../../db/schemas/tasksChecklists";
import { getContextUserOrganizationMember } from "../../utils/userActiveOrganization";
import { checkTaskAssignee } from "../../utils/checkTaskAssignee";

const tasksRoutes = new Hono().basePath("/tasks");

const handleGetTasks: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const user = getContextUser(c);
  const tasksService = new TasksService(db);
  const workspaceId = getHeaderActiveWorkspace(c);
  const projectId = c.req.query("project-id");
  const tasks = await tasksService.getTasks({
    filters: {
      workspaceId: workspaceId!,
      projectId: projectId,
      userId: user.id,
    },
  });
  return c.json({ tasks });
};

tasksRoutes.get(
  "/",
  checkUserPermission({
    type: "organizationAndWorkspace",
    rolePermission: "task:read",
  }),
  handleGetTasks,
);

const handleCreateTask: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const user = getContextUser(c);
  const workspaceId = getHeaderActiveWorkspace(c);
  const { title, description, parentTaskId, startAt, endAt, projectId } =
    await c.req.json();

  const parsedTask = createTaskSchema
    .pick({
      title: true,
      description: true,
      parentTaskId: true,
      startAt: true,
      endAt: true,
      projectId: true,
    })
    .parse({
      title,
      description,
      parentTaskId,
      startAt,
      endAt,
      projectId,
    });
  const projectService = new ProjectsService(db);
  const project = await projectService.getProject({
    filters: {
      projectId: projectId!,
      userId: user.id,
      workspaceId: workspaceId!,
    },
  });
  if (!project) {
    c.status(StatusCodes.NOT_FOUND);
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.NOT_FOUND,
        message: "Task not found",
      }),
    );
  }
  const taskService = new TasksService(db);
  const task = await taskService.createTask(parsedTask);
  return c.json(task);
};

tasksRoutes.post(
  "/",
  checkUserPermission({
    type: "organizationAndWorkspace",
    rolePermission: "task:create",
  }),
  handleCreateTask,
);

const handleUpdateTask: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const user = getContextUser(c);
  const taskId = c.req.param("id");
  const workspaceId = getHeaderActiveWorkspace(c);
  const { title, description, startAt, endAt } = await c.req.json();
  const parsedTask = updateTaskSchema
    .pick({
      title: true,
      description: true,
      startAt: true,
      endAt: true,
    })
    .parse({
      title,
      description,
      startAt,
      endAt,
    });
  const taskService = new TasksService(db);
  const task = await taskService.getTask({
    filters: {
      workspaceId: workspaceId!,
      taskId: taskId,
      userId: user.id,
    },
  });
  if (!task) {
    c.status(StatusCodes.NOT_FOUND);
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.NOT_FOUND,
        message: "Task not found",
      }),
    );
  }
  const updatedTask = await taskService.updateTask({
    id: taskId!,
    ...parsedTask,
  });
  if (!updatedTask) {
    c.status(StatusCodes.NOT_FOUND);
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.NOT_FOUND,
        message: "Task not found",
      }),
    );
  }
  return c.json(updatedTask);
};

tasksRoutes.patch(
  "/:id",
  checkUserPermission({
    type: "organizationAndWorkspace",
    rolePermission: "task:update",
  }),
  handleUpdateTask,
);

const handleGetTaskAssignees: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const taskId = c.req.param("id");
  const workspaceId = getHeaderActiveWorkspace(c);
  const taskAssigneesService = new TaskAssigneesServices(db);
  const taskAssignees = await taskAssigneesService.getTaskAssignees({
    filters: {
      taskId: taskId!,
      workspaceId: workspaceId!,
    },
  });
  return c.json({ taskAssignees });
};

tasksRoutes.get(
  "/:id/assignees",
  checkUserPermission({
    type: "organizationAndWorkspace",
    rolePermission: "task_assignee:read",
  }),
  handleGetTaskAssignees,
);

const handleUpdateTaskAssignees: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const user = getContextUser(c);
  const workspaceId = getHeaderActiveWorkspace(c);
  const organizationMember = getContextUserOrganizationMember(c);
  const workspaceRole = getContextUserWorkspaceRole(c);
  const taskId = c.req.param("id");
  const { assignees } = await c.req.json();
  const parsedAssignees = insertTaskAssignee.shape.organizationMemberId
    .array()
    .parse(assignees);
  const taskService = new TasksService(db);
  const task = await taskService.getTask({
    filters: {
      workspaceId: workspaceId!,
      taskId: taskId!,
      userId: user.id,
    },
  });
  if (!task) {
    c.status(StatusCodes.NOT_FOUND);
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.NOT_FOUND,
        message: "Task not found",
      }),
    );
  }
  const taskAssigneeService = new TaskAssigneesServices(db);
  if (
    !parsedAssignees.some((item) => item === organizationMember.id) &&
    organizationMember.role === "member" &&
    workspaceRole === "member"
  ) {
    await checkTaskAssignee({
      db,
      c,
      filters: {
        taskId: taskId!,
        workspaceId: workspaceId!,
        userId: user.id,
      },
    });
  }
  const updatedAssignees = await taskAssigneeService.updateTaskAssignees({
    taskId: taskId!,
    assignees: parsedAssignees,
  });
  return c.json(updatedAssignees);
};

tasksRoutes.patch(
  "/:id/assignees",
  checkUserPermission({
    type: "organizationAndWorkspace",
    rolePermission: "task_assignee:update",
  }),
  handleUpdateTaskAssignees,
);

const handleGetTaskChecklists: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const taskId = c.req.param("id");
  const workspaceId = getHeaderActiveWorkspace(c);
  const taskChecklistsService = new TaskChecklistsServices(db);
  const checklists = await taskChecklistsService.getTaskChecklists({
    filters: {
      workspaceId: workspaceId!,
      taskId: taskId!,
    },
  });
  return c.json({
    checklists,
  });
};

tasksRoutes.get(
  "/:id/checklists",
  checkUserPermission({
    type: "organizationAndWorkspace",
    rolePermission: "task_checklist:read",
  }),
  handleGetTaskChecklists,
);

const handleUpdateTaskChecklists: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const user = getContextUser(c);
  const workspaceId = getHeaderActiveWorkspace(c);
  const taskId = c.req.param("id");
  const { checklists } = await c.req.json();
  const taskService = new TasksService(db);
  const task = await taskService.getTask({
    filters: {
      workspaceId: workspaceId!,
      taskId: taskId!,
      userId: user.id,
    },
  });
  if (!task) {
    c.status(StatusCodes.NOT_FOUND);
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.NOT_FOUND,
        message: "Task not found",
      }),
    );
  }
  const parsedChecklists = insertTasksChecklists
    .omit({ taskId: true, createdAt: true, updatedAt: true })
    .array()
    .parse(checklists);
  const taskChecklistsService = new TaskChecklistsServices(db);
  const updatedChecklists = await taskChecklistsService.updateTaskChecklist({
    taskId: taskId!,
    workspaceId: workspaceId!,
    checklists: parsedChecklists,
  });
  return c.json(updatedChecklists);
};

tasksRoutes.patch(
  "/:id/checklists",
  checkUserPermission({
    type: "organizationAndWorkspace",
    rolePermission: "task_checklist:update",
  }),
  handleUpdateTaskChecklists,
);

export { tasksRoutes };
