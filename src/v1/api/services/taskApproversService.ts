import type { DBExecuter } from "../../db/connect";
import {
  type InsertTaskApprovers,
  taskApprovers,
} from "../../db/schemas/taskApprovers";
import { tasks } from "../../db/schemas/tasks";
import { projects } from "../../db/schemas/projects";
import { organizationMembers } from "../../db/schemas/organizationMembers";
import { users } from "../../db/schemas/users";
import { eq, and } from "drizzle-orm";

export class TaskApproversService {
  constructor(private readonly db: DBExecuter) {}
  async getTaskApprovers({
    filters,
  }: {
    filters: {
      taskId: string;
      workspaceId: string;
    };
  }) {
    const filtersConditions = [
      eq(taskApprovers.taskId, filters.taskId),
      eq(projects.workspaceId, filters.workspaceId),
    ];
    const baseQuery = this.db
      .select({
        id: taskApprovers.id,
        organizationMemberId: taskApprovers.organizationMemberId,
        taskId: taskApprovers.taskId,
        approved: taskApprovers.approved,
        approvedAt: taskApprovers.approvedAt,
        username: users.username,
        userFirstName: users.firstName,
        userLastName: users.lastName,
        userAvatar: users.avatar,
      })
      .from(taskApprovers)
      .innerJoin(tasks, eq(taskApprovers.taskId, tasks.id))
      .innerJoin(projects, eq(tasks.projectId, projects.id))
      .innerJoin(
        organizationMembers,
        eq(organizationMembers.id, taskApprovers.organizationMemberId),
      )
      .innerJoin(users, eq(users.id, organizationMembers.userId));

    const taskApproversResult = await baseQuery.where(
      and(...filtersConditions),
    );
    return taskApproversResult;
  }

  async updateTaskApprovers({
    taskId,
    workspaceId,
    approvers,
  }: {
    taskId: string;
    workspaceId: string;
    approvers: Pick<InsertTaskApprovers, "organizationMemberId" | "taskId">[];
  }) {
    const oldApprovers = await this.getTaskApprovers({
      filters: {
        taskId,
        workspaceId,
      },
    });
    const insertedApprovers = await this.db.transaction(async (tx) => {
      await this.deleteTaskApprovers({ taskId, db: tx });
      if (approvers.length > 0) {
        const insertedApprovers = await tx
          .insert(taskApprovers)
          .values(
            approvers.map((item) => {
              const targetItem = oldApprovers.find(
                (item) =>
                  item.organizationMemberId === item.organizationMemberId &&
                  item.taskId === item.taskId,
              );
              return {
                taskId,
                organizationMemberId: item.organizationMemberId,
                approved: targetItem?.approved ?? false,
                approvedAt: targetItem?.approvedAt ?? null,
              };
            }),
          )
          .returning({
            id: taskApprovers.id,
            approved: taskApprovers.approved,
          });
        return insertedApprovers;
      }
      return [];
    });
    return insertedApprovers;
  }

  async approveTask({
    taskId,
    organizationMemberId,
    approve,
  }: {
    taskId: string;
    organizationMemberId: string;
    approve: boolean;
  }) {
    const [updatedApprover] = await this.db
      .update(taskApprovers)
      .set({
        approved: approve,
        approvedAt: new Date(),
      })
      .where(
        and(
          eq(taskApprovers.taskId, taskId),
          eq(taskApprovers.organizationMemberId, organizationMemberId),
        ),
      )
      .returning({ id: taskApprovers.id });
    return updatedApprover;
  }

  private async deleteTaskApprovers({
    taskId,
    db,
  }: {
    taskId: string;
    db: DBExecuter;
  }) {
    await db.delete(taskApprovers).where(eq(taskApprovers.taskId, taskId));
  }
}
