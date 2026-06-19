import { and, eq, sql } from "drizzle-orm";
import { db } from "../../../../../db/v1/connect";
import { workspaceMembers } from "../../../../../db/v1/schemas/workspace_members";

export function checkWorkspaceMember(workspaceId: string, userId: string) {
  return db
    .select({
      one: sql<number>`1`,
    })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, userId),
      ),
    )
    .limit(1);
}
