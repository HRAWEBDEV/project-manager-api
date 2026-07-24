import { Context } from "hono";
import { TaskAssigneesServices } from "../services/taskAssigneesServices";
import { type DBExecuter } from "../../db/connect";
import { StatusCodes } from "http-status-codes";
import { getApiErrorShape } from "./apiTypes";

const NOT_A_TASK_ASSIGNEE = "You are not a task assignee";

async function checkTaskAssignee({
  db,
  c,
  filters,
}: { c: Context; db: DBExecuter } & Parameters<
  TaskAssigneesServices["getTaskAssignee"]
>[0]) {
  const taskAssigneeService = new TaskAssigneesServices(db);
  const taskAssignee = await taskAssigneeService.getTaskAssignee({ filters });
  if (!taskAssignee) {
    c.status(StatusCodes.FORBIDDEN);
    return c.json(
      getApiErrorShape({
        status: "failed",
        code: StatusCodes.FORBIDDEN,
        message: NOT_A_TASK_ASSIGNEE,
      }),
    );
  }
}

export { NOT_A_TASK_ASSIGNEE, checkTaskAssignee };
