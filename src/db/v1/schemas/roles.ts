import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { organizations } from "./organizations.ts";
import { trackChanges } from "../../utils/trackChanges.ts";

const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  title: text().notNull(),
  description: text(),
  ...trackChanges,
});

export { roles };
