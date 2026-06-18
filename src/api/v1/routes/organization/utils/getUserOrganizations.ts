import { db } from "../../../../../db/v1/connect";
import { organizationMembers } from "../../../../../db/v1/schemas/organizationMembers";
import { organizations } from "../../../../../db/v1/schemas/organizations";
import { eq } from "drizzle-orm";

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
    .where(eq(organizationMembers.userId, userId));
}
