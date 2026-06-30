import { and, eq, sql } from "drizzle-orm";
import { db } from "../../../../../db/v1/connect";
import { workspaceMembers } from "../../../../../db/v1/schemas/workspaceMembers";
import { workspaces } from "../../../../../db/v1/schemas/workspaces";
import { statuses } from "../../../../../db/v1/schemas/statuses";
import { priorities } from "../../../../../db/v1/schemas/priorities";
import { tasks } from "../../../../../db/v1/schemas/tasks";

export function checkWorkspaceMember(
  workspaceId:
    | (typeof workspaceMembers)["workspaceId"]
    | (typeof workspaces)["id"]
    | (typeof statuses)["workspaceId"]
    | (typeof priorities)["workspaceId"]
    | (typeof tasks)["workspaceId"]
    | string,
  userId: string,
) {
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
