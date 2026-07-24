import type { DBExecuter } from "../../db/connect";
import { type InsertTag, type Tag, tags } from "../../db/schemas/tags";
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

  async updateTag({
    name,
    color,
    workspaceId,
    id,
  }: Pick<Tag, "id" | "workspaceId"> &
    Partial<Pick<InsertTag, "name" | "color">>) {
    const updatedTag = await this.db
      .update(tags)
      .set({
        name,
        color,
      })
      .where(and(eq(tags.id, id), eq(tags.workspaceId, workspaceId)))
      .returning({
        id: tags.id,
      });
    return updatedTag[0];
  }

  async deleteTag({ id, workspaceId }: Pick<Tag, "id" | "workspaceId">) {
    const deletedTag = await this.db
      .delete(tags)
      .where(and(eq(tags.id, id), eq(tags.workspaceId, workspaceId)))
      .returning({
        id: tags.id,
      });
    return deletedTag[0];
  }
}

export { TagsService };
