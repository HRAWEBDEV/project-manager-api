import type { DBExecuter } from "../../db/connect";
import {
  type InsertOrganizationInvitation,
  organizationInvitations,
} from "../../db/schemas/organizationInvitations";
import { eq, inArray } from "drizzle-orm";
import { users } from "../../db/schemas/users";
import { organizations } from "../../db/schemas/organizations";

class OrganizationInvitationsService {
  constructor(private readonly db: DBExecuter) {}
  getUserInvitations = async ({
    filters: { userId },
  }: {
    filters: {
      userId: string;
    };
  }) => {
    const targetUser = this.db
      .select({
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, userId));
    const invitations = await this.db
      .select({
        id: organizationInvitations.id,
        organizationId: organizationInvitations.organizationId,
        organizationName: organizations.name,
        userId: organizationInvitations.userId,
        userName: users.firstName,
        userLastName: users.lastName,
        email: organizationInvitations.email,
        status: organizationInvitations.status,
        expiresAt: organizationInvitations.expiresAt,
        acceptedAt: organizationInvitations.acceptedAt,
        createAt: organizationInvitations.createAt,
      })
      .from(organizationInvitations)
      .innerJoin(users, eq(users.id, organizationInvitations.userId))
      .innerJoin(
        organizations,
        eq(organizations.id, organizationInvitations.organizationId),
      )
      .where(inArray(organizationInvitations.email, targetUser));

    return invitations;
  };

  async sendInvitation({
    userId,
    email,
    organizationId,
  }: Pick<
    InsertOrganizationInvitation,
    "userId" | "email" | "organizationId"
  >) {
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    const [createdInvitation] = await this.db
      .insert(organizationInvitations)
      .values({ userId, email, expiresAt, organizationId })
      .returning({
        id: organizationInvitations.id,
      })
      .onConflictDoUpdate({
        target: [
          organizationInvitations.email,
          organizationInvitations.organizationId,
        ],
        set: { expiresAt, status: "pending", acceptedAt: null },
      });
    return createdInvitation;
  }
}

export { OrganizationInvitationsService };
