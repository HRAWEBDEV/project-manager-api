import type { DBExecuter } from "../../db/connect";
import { tasks } from "../../db/schemas/tasks";
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
      projectId: string;
      userId: string;
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
      eq(tasks.projectId, filters.projectId),
      or(
        eq(organizationMembers.role, "owner"),
        eq(organizationMembers.role, "admin"),
        isNotNull(projectMembers.organizationMemberId),
      ),
    ];
    baseQuery = baseQuery
      .where(and(...filtersConditions))
      .orderBy(tasks.createdAt);
    const tasksResult = await baseQuery;
    return tasksResult;
  }
}

export { TasksService };
