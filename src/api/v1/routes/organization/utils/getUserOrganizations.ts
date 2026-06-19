import { db } from "../../../../../db/v1/connect";
import { organizationMembers } from "../../../../../db/v1/schemas/organizationMembers";
import { organizations } from "../../../../../db/v1/schemas/organizations";
import { eq, and } from "drizzle-orm";

export function getUserOrganizations(userId: string) {
  return db
    .select({
      id: organizations.id,
      name: organizations.name,
      address: organizations.address,
    })
    .from(organizationMembers)
    .innerJoin(
      organizations,
      eq(organizationMembers.organizationId, organizations.id),
    )
    .where(
      and(
        eq(organizationMembers.userId, userId),
        eq(organizations.deleted, false),
      ),
    )
    .orderBy(organizations.createdAt);
}
