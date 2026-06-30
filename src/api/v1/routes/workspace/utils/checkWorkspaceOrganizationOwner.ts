import { db } from "../../../../../db/v1/connect";
import { workspaces } from "../../../../../db/v1/schemas/workspaces";
import { organizations } from "../../../../../db/v1/schemas/organizations";
import { projects } from "../../../../../db/v1/schemas/projects";
import { priorities } from "../../../../../db/v1/schemas/priorities";
import { organizationMembers } from "../../../../../db/v1/schemas/organizationMembers";
import { and, eq, sql } from "drizzle-orm";

export function checkWorkspaceOrganizationOwner(
  workspaceId:
    | typeof workspaces.id
    | typeof projects.workspaceId
    | typeof priorities.workspaceId
    | string,
  userId: string,
) {
  return db
    .select({
      one: sql<number>`1`,
    })
    .from(workspaces)
    .innerJoin(organizations, eq(organizations.id, workspaces.organizationId))
    .innerJoin(
      organizationMembers,
      eq(organizationMembers.organizationId, organizations.id),
    )
    .where(
      and(
        eq(workspaces.id, workspaceId),
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.role, "owner"),
      ),
    )
    .limit(1);
}
