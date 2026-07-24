import type { DBExecuter } from "../../db/connect";
import {
  type InsertTasksChecklists,
  tasksChecklists,
} from "../../db/schemas/tasksChecklists";
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
      .orderBy(tasksChecklists.sortNo, tasksChecklists.createdAt);
    return checklists;
  }

  async updateTaskChecklist({
    taskId,
    workspaceId,
    checklists,
  }: {
    taskId: string;
    workspaceId: string;
    checklists: Pick<
      InsertTasksChecklists,
      "id" | "title" | "isCompleted" | "sortNo"
    >[];
  }) {
    const oldChecklists = await this.getTaskChecklists({
      filters: {
        workspaceId,
        taskId,
      },
    });
    const updatedTaskchecklists = await this.db.transaction(async (tx) => {
      await this.deleteTaskChecklist({ taskId, db: tx });
      if (!!checklists.length) {
        const updateTaskChecklist = await tx
          .insert(tasksChecklists)
          .values(
            checklists.map((item) => {
              let completedAt: Date | null = null;
              if (item.isCompleted) {
                if (item.id) {
                  completedAt =
                    oldChecklists.find((item) => item.id === item.id)
                      ?.completedAt ?? new Date();
                } else {
                  completedAt = new Date();
                }
              }
              return {
                title: item.title,
                isCompleted: item.isCompleted,
                sortNo: item.sortNo,
                completedAt,
                taskId: taskId,
              };
            }),
          )
          .returning({ id: tasksChecklists.id });
        return updateTaskChecklist;
      }
      return [];
    });
    return updatedTaskchecklists;
  }

  private async deleteTaskChecklist({
    taskId,
    db,
  }: {
    taskId: string;
    db: DBExecuter;
  }) {
    await db.delete(tasksChecklists).where(eq(tasksChecklists.taskId, taskId));
  }
}

export { TaskChecklistsServices };
