import { pgTable, uuid } from "drizzle-orm/pg-core";
import { organizations } from "./organizations.ts";
import { users } from "./users.ts";
import { trackChanges } from "../../utils/trackChanges.ts";

const organizationMembers = pgTable("organization_members", {
  id: uuid().primaryKey().defaultRandom(),
  organizationId: uuid("organization_id").references(() => organizations.id),
  userId: uuid("user_id").references(() => users.id),
  ...trackChanges,
});

export { organizationMembers };
