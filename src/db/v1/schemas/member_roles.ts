import { pgTable, uuid } from "drizzle-orm/pg-core";
import { roles } from "./roles.ts";
import { users } from "./users.ts";
import { trackChanges } from "../../utils/trackChanges.ts";

const memberRoles = pgTable("member_roles", {
  id: uuid().defaultRandom().primaryKey(),
  roleId: uuid("role_id").notNull().references(() => roles.id),
  memberId: uuid("member").notNull().references(() => users.id),
  ...trackChanges,
});

export { memberRoles };
