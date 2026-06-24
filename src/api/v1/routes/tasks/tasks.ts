import { Hono, type Handler } from "hono";
import { tasks } from "../../../../db/v1/schemas/tasks";
import { eq } from "drizzle-orm";
import {
  type WithSessionVariables,
  USER,
} from "../auth/utils/contextSessionVaraibles";

const tasksRoutes = new Hono().basePath("/tasks");

const handleGetTasks: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = c.get(USER);
  const filterTasksCoditions = [eq(tasks.deleted, false)];
};

tasksRoutes.get("/", handleGetTasks);

export { tasksRoutes };
