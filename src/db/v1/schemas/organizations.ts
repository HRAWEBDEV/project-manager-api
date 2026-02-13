import { pgTable, uuid, varchar } from "drizzle-orm/pg-core";
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
  code: varchar({ length: 255 }).notNull(),
  name: varchar({ length: 255 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 255 }).notNull(),
  email: varchar({ length: 255 }),
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
