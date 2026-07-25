import type { DBExecuter } from "../../db/connect";
import { taskTags } from "../../db/schemas/taskTags";
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
}

export { TaskTagsService };
