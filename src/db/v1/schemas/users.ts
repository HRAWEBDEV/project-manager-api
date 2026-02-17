import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { trackChanges } from "../../utils/trackChanges.ts";

const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  email: text("email"),
  ...trackChanges,
});

export { users };
