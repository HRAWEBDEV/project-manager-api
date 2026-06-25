import { pgTable, uuid, unique } from "drizzle-orm/pg-core";
import { organizations } from "./organizations";
import { users } from "./users";
import { trackChanges } from "../utils/trackChanges";

type OrganizationMembers = typeof organizationMembers.$inferSelect;

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
export { organizationMembers };
