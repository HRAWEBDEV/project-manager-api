import { pgTable, uuid, pgEnum, unique, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";
import { organizations } from "./organizations";

const roleEnum = pgEnum("organization_roles", ["owner", "admin", "member"]);

type OrganizationMember = typeof organizationMembers.$inferSelect;
type InsertOrganizationMember = typeof organizationMembers.$inferInsert;

const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: roleEnum("role").notNull().default("member"),
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
    addedBy: uuid("added_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (table) => [
    unique("organization_members_unique").on(
      table.organizationId,
      table.userId,
    ),
  ],
);

export type { OrganizationMember, InsertOrganizationMember };
export { organizationMembers, roleEnum };
