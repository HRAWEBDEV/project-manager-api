import { pgTable, uuid } from "drizzle-orm/pg-core";
import { roles } from "./roles.ts";
import { permissions } from "./permissions.ts";
import { trackChanges } from "../../utils/trackChanges.ts";

const rolePermissions = pgTable("role_permissions", {
  id: uuid().defaultRandom().primaryKey(),
  roleId: uuid("role_id").notNull().references(() => roles.id),
  permissionId: uuid("permission_id").notNull().references(() =>
    permissions.id
  ),
  ...trackChanges,
});

export { rolePermissions };
