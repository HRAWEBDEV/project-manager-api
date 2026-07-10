import { pgTable, uuid, pgEnum, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./users";
import { organizations } from "./organizations";

const roleEnum = pgEnum("organization_roles", ["owner", "admin", "member"]);

const organizationMembers = pgTable(
  "organization_members",
  {
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    role: roleEnum("role").notNull().default("member"),
  },
  (table) => [primaryKey({ columns: [table.organizationId, table.userId] })],
);

export { organizationMembers, roleEnum };
