import { db } from "../../../../../db/v1/connect";
import { boards } from "../../../../../db/v1/schemas/boards";
import { projectMembers } from "../../../../../db/v1/schemas/projectMember";
import { and, eq, sql } from "drizzle-orm";

export function checkBoardMember(boardId: string, userId: string) {
  return db
    .select({
      one: sql<number>`1`,
    })
    .from(boards)
    .innerJoin(projectMembers, eq(boards.projectId, projectMembers.projectId))
    .where(and(eq(boards.id, boardId), eq(projectMembers.userId, userId)))
    .limit(1);
}
