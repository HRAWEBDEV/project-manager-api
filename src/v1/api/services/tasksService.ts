import type { DBExecuter } from "../../db/connect";
import { type InsertTask, type Task, tasks } from "../../db/schemas/tasks";
import { workspaces } from "../../db/schemas/workspaces";
import { organizationMembers } from "../../db/schemas/organizationMembers";
import { projects } from "../../db/schemas/projects";
import { projectMembers } from "../../db/schemas/projectMembers";
import { eq, and, or, isNotNull } from "drizzle-orm";

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
    baseQuery = baseQuery
      .where(and(...filtersConditions))
      .orderBy(tasks.createdAt);
    if (filters.taskId) {
      baseQuery = baseQuery.limit(1);
    }
    const tasksResult = await baseQuery;
    return tasksResult;
  }

  async getTask({
    filters,
  }: {
    filters: {
      workspaceId: string;
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
