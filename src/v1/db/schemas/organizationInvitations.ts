import {
  pgEnum,
  pgTable,
  uuid,
  varchar,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";

const organizationInvitationStatusEnum = pgEnum(
  "organization_invitation_status",
  ["pending", "accepted", "declined", "expired", "cancelled"],
);

type OrganizationInvitation = typeof organizationInvitations.$inferSelect;
type InsertOrganizationInvitation = typeof organizationInvitations.$inferInsert;

const organizationInvitations = pgTable(
  "organization_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id, {
        onDelete: "cascade",
      }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, {
        onDelete: "cascade",
      }),
    email: varchar("email", { length: 255 }).notNull(),
    status: organizationInvitationStatusEnum("status")
      .default("pending")
      .notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createAt: timestamp("create_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    unique("organization_invitations_org_email_unique").on(
      table.organizationId,
      table.email,
    ),
  ],
);

export type { OrganizationInvitation, InsertOrganizationInvitation };
export { organizationInvitations, organizationInvitationStatusEnum };
