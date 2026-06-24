import { Hono, type Handler } from "hono";
import { tasks, insertTaskSchema } from "../../../../db/v1/schemas/tasks";
import { workspaces } from "../../../../db/v1/schemas/workspaces";
import { projects } from "../../../../db/v1/schemas/projects";
import { boards } from "../../../../db/v1/schemas/boards";
import { statuses } from "../../../../db/v1/schemas/statuses";
import { priorities } from "../../../../db/v1/schemas/priorities";
import { and, eq, exists } from "drizzle-orm";
import { db } from "../../../../db/v1/connect";
import {
  type WithSessionVariables,
  USER,
} from "../auth/utils/contextSessionVaraibles";
import { checkWorkspaceMember } from "../workspace/utils/checkWorkspaceMember";
import { checkProjectMember } from "../projects/utils/checkProjectMember";
import { z } from "zod";

const tasksRoutes = new Hono().basePath("/tasks");

const handleGetTasks: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = c.get(USER);
  const workspaceQuery = c.req.query("workspace");
  const pageSizeQuery = c.req.query("page-size");
  const pageQuery = c.req.query("page");
  const { workspace, pageSize, page } = z
    .object({
      workspace: z.string().min(1),
      pageSize: z.coerce.number().min(1),
      page: z.coerce.number().min(0),
    })
    .parse({
      workspace: workspaceQuery,
      pageSize: pageSizeQuery,
      page: pageQuery,
    });
  const filterTasksConditions = [
    eq(workspaces.slug, workspace!),
    eq(tasks.deleted, false),
    exists(checkWorkspaceMember(tasks.workspaceId, user.id)),
    exists(checkProjectMember(tasks.projectId, user.id)),
  ];
  const orderByConditions = [workspaces.name, projects.name, tasks.createdAt];
  const baseQuery = db
    .select({
      id: tasks.id,
      workspaceId: tasks.workspaceId,
      workspace: workspaces.name,
      projectId: tasks.projectId,
      project: projects.name,
      boardId: tasks.boardId,
      board: boards.name,
      priorityId: tasks.priorityId,
      priority: priorities.title,
      statusId: tasks.statusId,
      status: statuses.title,
      title: tasks.title,
      description: tasks.description,
      position: tasks.position,
      startDate: tasks.startDate,
      dueDate: tasks.dueDate,
      completedAt: tasks.completedAt,
      isArchived: tasks.isArchived,
    })
    .from(tasks)
    .innerJoin(workspaces, eq(tasks.workspaceId, workspaces.id))
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .innerJoin(boards, eq(tasks.boardId, boards.id))
    .innerJoin(priorities, eq(tasks.priorityId, priorities.id))
    .innerJoin(statuses, eq(tasks.statusId, statuses.id));
  const result = await baseQuery
    .where(and(...filterTasksConditions))
    .limit(pageSize)
    .offset(page * pageSize)
    .orderBy(...orderByConditions);

  return c.json({
    tasks: result,
    page: Number(page),
    pageSize: Number(pageSize),
  });
};

tasksRoutes.get("/", handleGetTasks);

const handleCreateTask: Handler<{
  Variables: WithSessionVariables["Variables"];
}> = async (c) => {
  const user = c.get(USER);
  const {
    projectId,
    boardId,
    priorityId,
    statusId,
    title,
    description,
    position,
    startDate,
    dueDate,
    parentTaskId,
  } = await c.req.json();
  const parsedTask = insertTaskSchema
    .pick({
      priorityId: true,
      boardId: true,
      projectId: true,
      statusId: true,
      title: true,
      description: true,
      position: true,
      startDate: true,
      dueDate: true,
      parentTaskId: true,
    })
    .parse({
      priorityId,
      boardId,
      projectId,
      statusId,
      title,
      description,
      position,
      startDate,
      dueDate,
      parentTaskId,
    });
};

tasksRoutes.post("/", handleCreateTask);

export { tasksRoutes };
