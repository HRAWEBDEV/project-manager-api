import { db } from "../../../../../db/v1/connect";
import { projects } from "../../../../../db/v1/schemas/projects";
import { boards } from "../../../../../db/v1/schemas/boards";
import { tasks } from "../../../../../db/v1/schemas/tasks";
import { and, eq, sql } from "drizzle-orm";

export function checkProjectWorkspace(
  projectId:
    (typeof tasks)["projectId"] | (typeof boards)["projectId"] | string,
  workspaceId: string,
) {
  return db
    .select({
      one: sql<number>`1`,
    })
    .from(projects)
    .where(
      and(
        eq(projects.deleted, false),
        eq(projects.workspaceId, workspaceId),
        eq(projects.id, projectId),
      ),
    )
    .limit(1);
}
