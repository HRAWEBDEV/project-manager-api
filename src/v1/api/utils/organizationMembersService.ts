import { type DBExecuter } from "../../db/connect";
import {
  type InsertOrganizationMember,
  organizationMembers,
} from "../../db/schemas/organizationMembers";

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
}

export { OrganizationMembersService };
