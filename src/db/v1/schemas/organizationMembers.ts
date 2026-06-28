import { pgTable, uuid, unique, pgEnum } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";
import { trackChanges } from "../utils/trackChanges";

type OrganizationMembers = typeof organizationMembers.$inferSelect;

const roleEnum = pgEnum("organization_roles", ["owner", "admin", "member"]);

const organizationMembers = pgTable(
  "organization_members",
  {
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
    role: roleEnum("role").notNull(),
    createdAt: trackChanges.createdAt,
  },
  (table) => [
    unique("organization_memebers_unique").on(
      table.organizationId,
      table.userId,
    ),
  ],
);

export type { OrganizationMembers };
export { organizationMembers, roleEnum };
