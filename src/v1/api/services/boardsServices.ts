import type { DBExecuter } from "../../db/connect";
import { type Board, type InsertBoard, boards } from "../../db/schemas/boards";
import { projects } from "../../db/schemas/projects";
import { eq, and, sql, gt, lte, gte, lt } from "drizzle-orm";
import { NotFoundError } from "../utils/NotFound";

export class BoardsService {
  constructor(private readonly db: DBExecuter) {}
  async getBoards({
    filters,
  }: {
    filters: {
      boardId?: string;
      projectId?: string;
      workspaceId: string;
    };
  }) {
    if (!filters.boardId && !filters.projectId) {
      throw new Error("boardId or projectId is required to get boards");
    }
    const filtersCondition = [eq(projects.workspaceId, filters.workspaceId)];
    if (filters.projectId) {
      filtersCondition.push(eq(boards.projectId, filters.projectId));
    }
    if (filters.boardId) {
      filtersCondition.push(eq(boards.id, filters.boardId));
    }
    let baseQuery = this.db
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
      .innerJoin(projects, eq(boards.projectId, projects.id))
      .$dynamic();
    baseQuery = baseQuery
      .where(and(...filtersCondition))
      .orderBy(boards.position, boards.createdAt);
    if (filters.boardId) {
      baseQuery = baseQuery.limit(1);
    }
    const boardsResult = await baseQuery;
    return boardsResult;
  }

  async getBoard({
    filters,
  }: {
    filters: {
      boardId: string;
      workspaceId: string;
    };
  }) {
    return (await this.getBoards({ filters }))[0];
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

  async updateBoard({
    id,
    name,
    color,
    position,
    workspaceId,
  }: Pick<Board, "id"> &
    Partial<Pick<Board, "name" | "color" | "position">> & {
      workspaceId: string;
    }) {
    const board = await this.getBoard({
      filters: {
        boardId: id,
        workspaceId,
      },
    });
    if (!board) throw new NotFoundError("board not found");
    const updatedBoard = await this.db.transaction(async (tx) => {
      const newPosition = position || board.position;
      await tx
        .update(boards)
        .set({
          position: 0,
        })
        .where(eq(boards.id, id));
      if (board.position < newPosition) {
        await tx
          .update(boards)
          .set({
            position: sql`${boards.position} - 1`,
          })
          .where(
            and(
              eq(boards.projectId, board.projectId),
              gt(boards.position, board.position),
              lte(boards.position, newPosition),
            ),
          );
      } else if (board.position > newPosition) {
        await tx
          .update(boards)
          .set({
            position: sql`${boards.position} + 1`,
          })
          .where(
            and(
              eq(boards.projectId, board.projectId),
              gte(boards.position, newPosition),
              lt(boards.position, board.position),
            ),
          );
      }
      const [updatedBoard] = await tx
        .update(boards)
        .set({
          name,
          color,
          position: newPosition,
        })
        .where(eq(boards.id, id))
        .returning({
          id: boards.id,
        });
      return updatedBoard;
    });
    return updatedBoard;
  }

  async deleteBoard({
    boardId,
    workspaceId,
  }: {
    boardId: string;
    workspaceId: string;
  }) {
    const board = await this.getBoard({
      filters: {
        boardId,
        workspaceId,
      },
    });
    const deletedBoard = await this.db.transaction(async (tx) => {
      if (!board) {
        throw new NotFoundError("Board not found");
      }
      const [deletedBoard] = await tx
        .delete(boards)
        .where(eq(boards.id, boardId))
        .returning({
          id: boards.id,
        });
      await tx
        .update(boards)
        .set({
          position: sql`${boards.position} - 1`,
        })
        .where(
          and(
            eq(boards.projectId, board.projectId),
            gt(boards.position, board.position),
          ),
        );
      return deletedBoard;
    });
    return deletedBoard;
  }
}
