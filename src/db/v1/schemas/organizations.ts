import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { trackChanges } from "../../utils/trackChanges.ts";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";

type Organization = z.infer<typeof organizationSelectSchema>;
type UpdateOrganization = z.infer<typeof organizationUpdateSchema>;

export const organizations = pgTable("organizations", {
  id: uuid().defaultRandom().primaryKey(),
  name: text().notNull(),
  email: text(),
  address: text(),
  ...trackChanges,
});

const organizationSelectSchema = createSelectSchema(organizations);
const organizationInsertSchema = createInsertSchema(organizations);
const organizationUpdateSchema = createUpdateSchema(organizations);

export type { Organization, UpdateOrganization };
export {
  organizationInsertSchema,
  organizationSelectSchema,
  organizationUpdateSchema,
};
