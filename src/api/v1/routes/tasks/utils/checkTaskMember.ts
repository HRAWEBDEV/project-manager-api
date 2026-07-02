import { db } from "../../../../../db/v1/connect";
import { projectMembers } from "../../../../../db/v1/schemas/projectMember";
import { tasks } from "../../../../../db/v1/schemas/tasks";
import { and, eq, sql } from "drizzle-orm";

export function checkTaskMember(taskId: string, userId: string) {
  return db
    .select({
      one: sql<number>`1`,
    })
    .from(tasks)
    .innerJoin(projectMembers, eq(tasks.projectId, projectMembers.projectId))
    .where(and(eq(tasks.id, taskId), eq(projectMembers.userId, userId)))
    .limit(1);
}
