import { pgTable, serial, uuid, pgEnum } from "drizzle-orm/pg-core";
import { users } from "./users";
import { organizations } from "./organizations";
import { trackChanges } from "../utils/trackChanges";

type OrganizationRole = typeof organizationRoles.$inferSelect;

const organizationRoles = pgTable("organization_roles", {
  id: serial("id").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
    }),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id, {
      onDelete: "cascade",
    }),
  role: pgEnum("role", ["owner", "admin", "member"])().notNull(),
  createdAt: trackChanges["createdAt"],
  updatedAt: trackChanges["updatedAt"],
});

export type { OrganizationRole };
export { organizationRoles };
