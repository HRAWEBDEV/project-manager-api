import { type DBExecuter } from "../../db/connect";
import {
  type InsertTaskAssignee,
  taskAssignees,
} from "../../db/schemas/taskAssignees";
import { eq, and, inArray } from "drizzle-orm";
import { tasks } from "../../db/schemas/tasks";
import { projects } from "../../db/schemas/projects";
import { organizationMembers } from "../../db/schemas/organizationMembers";
import { users } from "../../db/schemas/users";

class TaskAssigneesServices {
  constructor(private readonly db: DBExecuter) {}
  async getTaskAssignees({
    filters,
  }: {
    filters: {
      userId?: string;
      taskId: string | string[];
      workspaceId: string;
    };
  }) {
    const filterCondition = [eq(projects.workspaceId, filters.workspaceId)];
    if (typeof filters.taskId === "string") {
      filterCondition.push(eq(taskAssignees.taskId, filters.taskId));
    } else {
      filterCondition.push(inArray(taskAssignees.taskId, filters.taskId));
    }
    if (filters.userId) {
      filterCondition.push(eq(users.id, filters.userId));
    }
    let baseQuery = this.db
      .select({
        id: taskAssignees.id,
        taskId: taskAssignees.taskId,
        organizationMemberId: taskAssignees.organizationMemberId,
        userId: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
        avatar: users.avatar,
        completedAt: taskAssignees.completedAt,
      })
      .from(taskAssignees)
      .innerJoin(tasks, eq(taskAssignees.taskId, tasks.id))
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .innerJoin(
        organizationMembers,
        eq(taskAssignees.organizationMemberId, organizationMembers.id),
      )
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .$dynamic();

    baseQuery = baseQuery.where(and(...filterCondition));
    if (filters.userId) {
      baseQuery = baseQuery.limit(1);
    }
    const tasksAssigness = await baseQuery;

    return tasksAssigness;
  }

  async getTaskAssignee({
    filters,
  }: {
    filters: {
      userId: string;
      taskId: string;
      workspaceId: string;
    };
  }) {
    return (await this.getTaskAssignees({ filters }))[0];
  }

  async updateTaskAssignees({
    taskId,
    assignees,
  }: {
    taskId: InsertTaskAssignee["taskId"];
    assignees: InsertTaskAssignee["organizationMemberId"][];
  }) {
    const updatedAssignees = await this.db.transaction(async (tx) => {
      await this.deleteTaskAssignees({ taskId, db: tx });
      if (!!assignees.length) {
        const updatedAssignees = await tx
          .insert(taskAssignees)
          .values(
            assignees.map((assignee) => ({
              taskId,
              organizationMemberId: assignee,
            })),
          )
          .returning({ id: taskAssignees.id });
        return updatedAssignees;
      }
      return [];
    });
    return updatedAssignees;
  }
  private async deleteTaskAssignees({
    taskId,
    db,
  }: {
    taskId: string;
    db: DBExecuter;
  }) {
    await db.delete(taskAssignees).where(eq(taskAssignees.taskId, taskId));
  }
}

export { TaskAssigneesServices };
