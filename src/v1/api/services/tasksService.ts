import type { DBExecuter } from "../../db/connect";
import { type InsertTask, type Task, tasks } from "../../db/schemas/tasks";
import { taskAssignees } from "../../db/schemas/taskAssignees";
import { workspaces } from "../../db/schemas/workspaces";
import { organizationMembers } from "../../db/schemas/organizationMembers";
import { projects } from "../../db/schemas/projects";
import { boards } from "../../db/schemas/boards";
import { projectMembers } from "../../db/schemas/projectMembers";
import { eq, and, or, isNotNull, exists, inArray } from "drizzle-orm";
import { TaskAssigneesServices } from "./taskAssigneesServices";

class TasksService {
  constructor(private readonly db: DBExecuter) {}
  async getTasks({
    filters,
  }: {
    filters: {
      workspaceId: string;
      projectId?: string;
      userId: string;
      taskId?: string;
      assignees?: string[];
    };
  }) {
    let baseQuery = this.db
      .select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        startAt: tasks.startAt,
        endAt: tasks.endAt,
        completedAt: tasks.completedAt,
        parentTaskId: tasks.parentTaskId,
        createdBy: tasks.createdBy,
        createdAt: tasks.createdAt,
        updatedAt: tasks.updatedAt,
        projectId: tasks.projectId,
        projectName: projects.name,
        workspaceId: workspaces.id,
        workspaceName: workspaces.name,
        boardId: boards.id,
        boardName: boards.name,
        boardColor: boards.color,
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .leftJoin(workspaces, eq(projects.workspaceId, workspaces.id))
      .leftJoin(
        organizationMembers,
        and(
          eq(workspaces.organizationId, organizationMembers.organizationId),
          eq(organizationMembers.userId, filters.userId),
        ),
      )
      .leftJoin(
        projectMembers,
        and(
          eq(projectMembers.projectId, tasks.projectId),
          eq(projectMembers.organizationMemberId, organizationMembers.id),
        ),
      )
      .leftJoin(boards, eq(boards.id, tasks.boardId))
      .$dynamic();
    const filtersConditions = [
      eq(workspaces.id, filters.workspaceId),
      or(
        eq(organizationMembers.role, "owner"),
        eq(organizationMembers.role, "admin"),
        isNotNull(projectMembers.organizationMemberId),
      ),
    ];
    if (filters.projectId) {
      filtersConditions.push(eq(tasks.projectId, filters.projectId));
    }
    if (filters.taskId) {
      filtersConditions.push(eq(tasks.id, filters.taskId));
    }
    if (filters.assignees && filters.assignees.length > 0) {
      filtersConditions.push(
        exists(
          this.db
            .select({ id: taskAssignees.id })
            .from(taskAssignees)
            .where(
              and(
                eq(taskAssignees.taskId, tasks.id),
                inArray(taskAssignees.organizationMemberId, filters.assignees),
              ),
            ),
        ),
      );
    }
    baseQuery = baseQuery
      .where(and(...filtersConditions))
      .orderBy(tasks.createdAt);
    if (filters.taskId) {
      baseQuery = baseQuery.limit(1);
    }
    const tasksResult = await baseQuery;
    const taskAssigneesService = new TaskAssigneesServices(this.db);
    const assignees = await taskAssigneesService.getTaskAssignees({
      filters: {
        taskId: tasksResult.map((task) => task.id),
        workspaceId: filters.workspaceId,
      },
    });
    const assigneesByTask = new Map<string, typeof assignees>();
    for (const assignee of assignees) {
      const list = assigneesByTask.get(assignee.taskId) ?? [];
      list.push(assignee);
      assigneesByTask.set(assignee.taskId, list);
    }
    return tasksResult.map((task) => ({
      ...task,
      assignees: assigneesByTask.get(task.id) ?? [],
    }));
  }

  async getTask({
    filters,
  }: {
    filters: {
      workspaceId: string;
      projectId?: string;
      userId: string;
      taskId?: string;
    };
  }) {
    return (
      await this.getTasks({
        filters,
      })
    )[0];
  }

  async createTask(
    task: Pick<
      InsertTask,
      | "title"
      | "description"
      | "createdBy"
      | "projectId"
      | "parentTaskId"
      | "startAt"
      | "endAt"
    >,
  ) {
    const [createdTask] = await this.db.insert(tasks).values(task).returning({
      id: tasks.id,
    });
    return createdTask;
  }

  async updateTask({
    title,
    description,
    startAt,
    endAt,
    id,
  }: Pick<Task, "id"> &
    Partial<Pick<InsertTask, "title" | "description" | "startAt" | "endAt">>) {
    const [updatedTask] = await this.db
      .update(tasks)
      .set({
        title,
        description,
        startAt,
        endAt,
      })
      .where(eq(tasks.id, id))
      .returning({
        id: tasks.id,
      });
    return updatedTask;
  }
}

export { TasksService };
