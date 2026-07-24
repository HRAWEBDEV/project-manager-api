import type { DBExecuter } from "../../db/connect";
import { type InsertTag, tags } from "../../db/schemas/tags";
import { eq, and } from "drizzle-orm";

class TagsService {
  constructor(private readonly db: DBExecuter) {}
  async getTags({
    filters,
  }: {
    filters: {
      workspaceId: string;
    };
  }) {
    const filterConditions = [eq(tags.workspaceId, filters.workspaceId)];
    const baseQuery = this.db.select().from(tags);
    const tagsResult = await baseQuery
      .where(and(...filterConditions))
      .orderBy(tags.createdAt);
    return tagsResult;
  }
  async createTag(tag: Pick<InsertTag, "name" | "workspaceId" | "color">) {
    const createdTag = await this.db
      .insert(tags)
      .values({
        name: tag.name,
        color: tag.color,
        workspaceId: tag.workspaceId,
      })
      .returning({ id: tags.id });
    return createdTag;
  }
}

export { TagsService };
