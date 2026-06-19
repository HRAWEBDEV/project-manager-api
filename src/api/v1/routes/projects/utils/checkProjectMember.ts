import { db } from "../../../../../db/v1/connect";
import { projectMembers } from "../../../../../db/v1/schemas/projectMember";
import { and, eq, sql } from "drizzle-orm";

export function checkProjectMember(projectId: string, userId: string) {
  return db
    .select({
      one: sql<number>`1`,
    })
    .from(projectMembers)
    .where(
      and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
      ),
    )
    .limit(1);
}
