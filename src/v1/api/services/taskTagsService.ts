import type { DBExecuter } from "../../db/connect";
import { type InsertTaskTag, taskTags } from "../../db/schemas/taskTags";
import { tags } from "../../db/schemas/tags";
import { eq, and } from "drizzle-orm";

class TaskTagsService {
  constructor(private readonly db: DBExecuter) {}

  async getTaskTags({
    filters,
  }: {
    filters: {
      taskId: string;
      workspaceId: string;
    };
  }) {
    const filterConditions = [
      eq(taskTags.taskId, filters.taskId),
      eq(tags.workspaceId, filters.workspaceId),
    ];
    const baseQuery = this.db
      .select({
        id: taskTags.id,
        taskId: taskTags.taskId,
        tagId: taskTags.tagId,
        tagName: tags.name,
        tagColor: tags.color,
      })
      .from(taskTags)
      .innerJoin(tags, eq(taskTags.tagId, tags.id));
    const taskTagsResult = await baseQuery.where(and(...filterConditions));
    return taskTagsResult;
  }

  async updateTaskTags({
    taskId,
    tags,
  }: {
    taskId: string;
    tags: Pick<InsertTaskTag, "taskId" | "tagId">[];
  }) {
    const updatedTaskTags = await this.db.transaction(async (tx) => {
      await this.deleteTaskTags({
        taskId,
        db: tx,
      });
      if (!!tags.length) {
        const updatedTaskTags = await tx
          .insert(taskTags)
          .values(
            tags.map((tag) => ({
              taskId: tag.taskId,
              tagId: tag.tagId,
            })),
          )
          .returning({ id: taskTags.id });
        return updatedTaskTags;
      }
      return [];
    });
    return updatedTaskTags;
  }

  private async deleteTaskTags({
    db,
    taskId,
  }: {
    db: DBExecuter;
    taskId: string;
  }) {
    await db.delete(taskTags).where(eq(taskTags.taskId, taskId));
  }
}

export { TaskTagsService };
