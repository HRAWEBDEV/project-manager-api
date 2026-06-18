import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { trackChanges } from "../utils/trackChanges";
import { createSelectSchema, createInsertSchema } from "drizzle-zod";
import { z } from "zod";

type Organization = typeof organizations.$inferSelect;

// first step we will create the organization with a free plan (no subscription)
const organizations = pgTable("organizations", {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull().unique(),
  email: text().notNull().unique(),
  address: text(),
  ...trackChanges,
});

const organizationSelectSchema = createSelectSchema(organizations);
const organizationInsertSchema = createInsertSchema(organizations, {
  email: (schema) => schema.and(z.email()),
});

export type { Organization };
export { organizations, organizationSelectSchema, organizationInsertSchema };
