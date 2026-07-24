import type { DBExecuter } from "../../db/connect";
import { tasksChecklists } from "../../db/schemas/tasksChecklists";
import { tasks } from "../../db/schemas/tasks";
import { and, eq } from "drizzle-orm";
import { projects } from "../../db/schemas/projects";

class TaskChecklistsServices {
  constructor(private readonly db: DBExecuter) {}
  async getTaskChecklists({
    filters,
  }: {
    filters: {
      workspaceId: string;
      taskId: string;
    };
  }) {
    const filterConditions = [
      eq(tasksChecklists.taskId, filters.taskId),
      eq(projects.workspaceId, filters.workspaceId),
    ];
    const baseQuery = this.db
      .select({
        id: tasksChecklists.id,
        taskId: tasksChecklists.taskId,
        title: tasksChecklists.title,
        isCompleted: tasksChecklists.isCompleted,
        completedAt: tasksChecklists.completedAt,
      })
      .from(tasksChecklists)
      .innerJoin(tasks, eq(tasksChecklists.taskId, tasks.id))
      .innerJoin(projects, eq(tasks.projectId, projects.id));
    const checklists = await baseQuery
      .where(and(...filterConditions))
      .orderBy(tasksChecklists.order);
    return checklists;
  }
  async updateTaskChecklist() {}
  async deleteTaskChecklist() {}
}
