import { pgTable, uuid, varchar, text } from "drizzle-orm/pg-core";
import { trackChanges } from "../utils/trackChanges";
import { createInsertSchema, createUpdateSchema } from "drizzle-zod";

type Organization = typeof organizations.$inferSelect;
type InsertOrganization = typeof organizations.$inferInsert;

const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 150 }).notNull().unique(),
  logo: text("logo"),
  description: text("description"),
  ...trackChanges,
});

const insertOrganizationSchema = createInsertSchema(organizations);
const updateOrganizationSchema = createUpdateSchema(organizations);

export type { Organization, InsertOrganization };
export { organizations, insertOrganizationSchema, updateOrganizationSchema };
