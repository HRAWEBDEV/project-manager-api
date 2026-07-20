import { type Handler, Hono } from "hono";
import type { WithSessionUserVariables } from "../../utils/sessionUserContext";
import { TasksService } from "../../services/tasksService";
import { checkUserPermission } from "../../middlewares/checkUserPermission";
import { getContextUser } from "../../utils/sessionUserContext";
import { getHeaderActiveWorkspace } from "../../utils/userActiveWorkspace";
import { db } from "../../../db/connect";
import { selectTasksSchema } from "../../../db/schemas/tasks";

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

export { tasksRoutes };
