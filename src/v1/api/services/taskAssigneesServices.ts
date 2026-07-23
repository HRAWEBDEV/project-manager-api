import { type DBExecuter } from "../../db/connect";
import {
  type InsertTaskAssignee,
  taskAssignees,
} from "../../db/schemas/taskAssignees";
import { eq, and } from "drizzle-orm";
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
      taskId: string;
      workspaceId: string;
    };
  }) {
    const filterCondition = [
      eq(taskAssignees.taskId, filters.taskId),
      eq(projects.workspaceId, filters.workspaceId),
    ];
    if (filters.userId) {
      filterCondition.push(eq(users.id, filters.userId));
    }
    const baseQuery = this.db
      .select({
        taskId: taskAssignees.taskId,
        organizationMemberId: taskAssignees.organizationMemberId,
        userId: users.id,
        username: users.username,
        firstName: users.firstName,
        lastName: users.lastName,
      })
      .from(taskAssignees)
      .innerJoin(tasks, eq(taskAssignees.taskId, tasks.id))
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .innerJoin(
        organizationMembers,
        eq(taskAssignees.organizationMemberId, organizationMembers.id),
      )
      .innerJoin(users, eq(organizationMembers.userId, users.id));

    const tasksAssigness = await baseQuery
      .where(and(...filterCondition))
      .orderBy(taskAssignees.createdAt);
    return tasksAssigness;
  }
  async updateTaskAssignees({
    taskId,
    assignees,
  }: {
    taskId: InsertTaskAssignee["taskId"];
    assignees: InsertTaskAssignee["organizationMemberId"][];
  }) {
    await this.deleteTaskAssignees(taskId);
    const updatedAssignees = await this.db
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
  async deleteTaskAssignees(taskId: string) {
    await this.db.delete(taskAssignees).where(eq(taskAssignees.taskId, taskId));
  }
}

export { TaskAssigneesServices };
