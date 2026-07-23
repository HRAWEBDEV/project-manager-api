import { type Handler, Hono } from "hono";
import type { WithSessionUserVariables } from "../../utils/sessionUserContext";
import { TasksService } from "../../services/tasksService";
import { checkUserPermission } from "../../middlewares/checkUserPermission";
import { getContextUser } from "../../utils/sessionUserContext";
import { getHeaderActiveWorkspace } from "../../utils/userActiveWorkspace";
import { db } from "../../../db/connect";
import {
  selectTasksSchema,
  createTaskSchema,
  updateTaskSchema,
} from "../../../db/schemas/tasks";
import { ProjectsService } from "../../services/projectsService";
import { StatusCodes } from "http-status-codes";
import { getApiErrorShape } from "../../utils/apiTypes";

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
  const { title, description, parentTaskId, startAt, endAt, projectId } =
    await c.req.json();
  const workspaceId = getHeaderActiveWorkspace(c);

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
  const projectsService = new ProjectsService(db);
  const workspaceProjects = await projectsService.getProjects({
    filters: {
      userId: user.id,
      workspaceId: workspaceId!,
      projectId: parsedTask.projectId,
    },
  });
  if (workspaceProjects.length === 0) {
    c.status(StatusCodes.NOT_FOUND);
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.NOT_FOUND,
        message: "Project not found",
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
  const taskId = c.req.param("id");
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
  const updatedTask = await taskService.updateTask({
    id: taskId!,
    ...parsedTask,
  });
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

export { tasksRoutes };
