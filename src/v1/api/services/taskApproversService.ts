import type { DBExecuter } from "../../db/connect";
import { taskApprovers } from "../../db/schemas/taskApprovers";
import { tasks } from "../../db/schemas/tasks";
import { projects } from "../../db/schemas/projects";
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
      .select()
      .from(taskApprovers)
      .innerJoin(tasks, eq(taskApprovers.taskId, tasks.id))
      .innerJoin(projects, eq(tasks.projectId, projects.id));

    const taskApproversResult = await baseQuery.where(
      and(...filtersConditions),
    );
    return taskApproversResult;
  }
}
