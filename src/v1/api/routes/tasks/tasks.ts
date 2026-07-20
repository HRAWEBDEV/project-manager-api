import { type Handler, Hono } from "hono";
import type { WithSessionUserVariables } from "../../utils/sessionUserContext";
import { TasksService } from "../../services/tasksService";
import { checkUserPermission } from "../../middlewares/checkUserPermission";
import { getContextUser } from "../../utils/sessionUserContext";
import { getHeaderActiveWorkspace } from "../../utils/userActiveWorkspace";
import { db } from "../../../db/connect";
import { selectTasksSchema, createTaskSchema } from "../../../db/schemas/tasks";
import { de } from "zod/v4/locales";

const tasksRoutes = new Hono().basePath("/tasks");

const handleGetTasks: Handler<{
  Variables: WithSessionUserVariables["Variables"];
}> = async (c) => {
  const user = getContextUser(c);
  const tasksService = new TasksService(db);
  const workspaceId = getHeaderActiveWorkspace(c);
  const projectId = c.req.query("project-id");
  const parsedQuery = selectTasksSchema
    .pick({
      projectId: true,
    })
    .parse({ projectId });
  const tasks = await tasksService.getTasks({
    filters: {
      workspaceId: workspaceId!,
      projectId: parsedQuery.projectId,
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

export { tasksRoutes };
