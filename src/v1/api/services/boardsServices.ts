import type { DBExecuter } from "../../db/connect";
import { type InsertBoard, boards } from "../../db/schemas/boards";
import { projects } from "../../db/schemas/projects";
import { eq, and, sql } from "drizzle-orm";

export class BoardsService {
  constructor(private readonly db: DBExecuter) {}
  async getBoards({
    filters,
  }: {
    filters: {
      projectId: string;
      workspaceId: string;
    };
  }) {
    const filtersCondition = [
      eq(boards.projectId, filters.projectId),
      eq(projects.workspaceId, filters.workspaceId),
    ];
    const baseQuery = this.db
      .select({
        id: boards.id,
        name: boards.name,
        position: boards.position,
        color: boards.color,
        createdBy: boards.createdBy,
        createdAt: boards.createdAt,
        updatedAt: boards.updatedAt,
        projectId: boards.projectId,
      })
      .from(boards)
      .innerJoin(projects, eq(boards.projectId, projects.id));
    const boardsResult = await baseQuery
      .where(and(...filtersCondition))
      .orderBy(boards.position, boards.createdAt);
    return boardsResult;
  }
  async createBoard(
    newBoard: Pick<InsertBoard, "name" | "projectId" | "color" | "createdBy">,
  ) {
    const [result] = await this.db
      .select({
        nextPosition: sql<number>`COALESCE(MAX(${boards.position}), 0) + 1`,
      })
      .from(boards)
      .where(eq(boards.projectId, newBoard.projectId));

    const [createdBoard] = await this.db
      .insert(boards)
      .values({
        name: newBoard.name,
        projectId: newBoard.projectId,
        color: newBoard.color,
        createdBy: newBoard.createdBy,
        position: result?.nextPosition || 1,
      })
      .returning({ id: boards.id });

    return createdBoard;
  }
}
