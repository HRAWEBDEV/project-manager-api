import { pgTable, uuid } from "drizzle-orm/pg-core";
import { roles } from "./roles.ts";
import { organizationMembers } from "./organizationsMembers.ts";
import { trackChanges } from "../../utils/trackChanges.ts";

const memberRoles = pgTable("member_roles", {
  id: uuid().defaultRandom().primaryKey(),
  roleId: uuid("role_id").references(() => roles.id),
  memberId: uuid("member").references(() => organizationMembers.id),
  ...trackChanges,
});

export { memberRoles };
