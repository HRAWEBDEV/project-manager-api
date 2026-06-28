import { db } from "../../../../../db/v1/connect";
import { organizationMembers } from "../../../../../db/v1/schemas/organizationMembers";
import { organizations } from "../../../../../db/v1/schemas/organizations";
import { workspaces } from "../../../../../db/v1/schemas/workspaces";
import { and, eq, sql } from "drizzle-orm";

export function checkOrganizationOwner(
  organizationId:
    typeof organizations.id | typeof workspaces.organizationId | string,
  userId: string,
) {
  return db
    .select({
      one: sql<number>`1`,
    })
    .from(organizationMembers)
    .where(
      and(
        eq(organizationMembers.organizationId, organizationId),
        eq(organizationMembers.userId, userId),
        eq(organizationMembers.role, "owner"),
      ),
    )
    .limit(1);
}
