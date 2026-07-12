import { type DBExecuter } from "../../db/connect";
import {
  type InsertOrganizationMember,
  organizationMembers,
} from "../../db/schemas/organizationMembers";
import { eq } from "drizzle-orm";

class OrganizationMembersService {
  constructor(private readonly db: DBExecuter) {}
  async createMember({
    userId,
    organizationId,
    role,
  }: Pick<InsertOrganizationMember, "organizationId" | "role" | "userId">) {
    const result = await this.db
      .insert(organizationMembers)
      .values({
        userId,
        organizationId,
        role,
      })
      .returning({
        id: organizationMembers.id,
      });
    return result[0];
  }
  async getOrganizationMember(organizationId: string) {
    const [member] = await this.db
      .select()
      .from(organizationMembers)
      .where(eq(organizationMembers.organizationId, organizationId))
      .limit(1);
    return member || null;
  }
}

export { OrganizationMembersService };
