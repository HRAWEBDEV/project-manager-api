import type { DBExecuter } from "../../db/connect";
import {
  type InsertOrganizationInvitation,
  type OrganizationInvitation,
  organizationInvitations,
} from "../../db/schemas/organizationInvitations";
import { eq, inArray, and, lte } from "drizzle-orm";
import { users } from "../../db/schemas/users";
import { organizations } from "../../db/schemas/organizations";
import {
  createSelectSchema,
  createUpdateSchema,
  createInsertSchema,
} from "drizzle-zod";

class OrganizationInvitationsService {
  constructor(private readonly db: DBExecuter) {}
  getUserInvitations = async ({
    filters: { userId, organizationId },
  }: {
    filters: {
      userId?: string;
      organizationId?: string;
    };
  }) => {
    if (!userId && !organizationId) {
      throw new Error(
        "userId or organizationId is required to get invitations",
      );
    }
    const filterConditions = [];
    if (organizationId) {
      filterConditions.push(
        eq(organizationInvitations.organizationId, organizationId),
      );
    }
    if (userId) {
      const targetUser = this.db
        .select({
          email: users.email,
        })
        .from(users)
        .where(eq(users.id, userId));
      filterConditions.push(inArray(organizationInvitations.email, targetUser));
    }
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
      .where(and(...filterConditions))
      .orderBy(organizationInvitations.createAt);

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

  async updateInvitationStatus({
    id,
    status,
    userId,
  }: Pick<OrganizationInvitation, "id" | "status" | "userId">) {
    const targetUser = this.db
      .select({
        email: users.email,
      })
      .from(users)
      .where(eq(users.id, userId));
    const [updatedInvitation] = await this.db
      .update(organizationInvitations)
      .set({ status })
      .where(
        and(
          eq(organizationInvitations.id, id),
          inArray(organizationInvitations.email, targetUser),
          lte(organizationInvitations.expiresAt, new Date()),
        ),
      )
      .returning({
        id: organizationInvitations.id,
        status: organizationInvitations.status,
      });
    return updatedInvitation;
  }

  async deleteInvitation({
    id,
    userId,
  }: Pick<OrganizationInvitation, "id" | "userId">) {
    const [deletedInvitation] = await this.db
      .delete(organizationInvitations)
      .where(
        and(
          eq(organizationInvitations.id, id),
          eq(organizationInvitations.userId, userId),
        ),
      )
      .returning({
        id: organizationInvitations.id,
      });
    return deletedInvitation;
  }
}

const selectInvitationSchema = createSelectSchema(organizationInvitations);
const insertInvitationSchema = createInsertSchema(organizationInvitations);
const updateInvitationStatusSchema = createUpdateSchema(
  organizationInvitations,
);

export {
  OrganizationInvitationsService,
  updateInvitationStatusSchema,
  insertInvitationSchema,
  selectInvitationSchema,
};
