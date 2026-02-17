import { boolean, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { roles } from "./roles.ts";
import { trackChanges } from "../../utils/trackChanges.ts";

const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  roleId: uuid("role_id").references(() => roles.id),
  name: text().notNull(),
  write: boolean().notNull().default(false),
  read: boolean().notNull().default(false),
  add: boolean().notNull().default(false),
  edit: boolean().notNull().default(false),
  description: text(),
  ...trackChanges,
});

export { permissions };
