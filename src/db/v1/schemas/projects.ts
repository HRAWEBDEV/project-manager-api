import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { organizations } from "./organizations.ts";
import { users } from "./users.ts";
import { trackChanges } from "../../utils/trackChanges.ts";

const projects = pgTable("projects", {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  description: text(),
  organizationId: uuid("organization_id").notNull().references(() =>
    organizations.id
  ),
  createdBy: uuid("created_by").notNull().references(() => users.id),
  ...trackChanges,
});

export { projects };
