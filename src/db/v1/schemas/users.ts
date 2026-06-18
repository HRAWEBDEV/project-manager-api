import { pgTable, text, uuid, boolean } from "drizzle-orm/pg-core";
import { trackChanges } from "../utils/trackChanges";
import { createSelectSchema, createInsertSchema } from "drizzle-zod";
import { z } from "zod";

type User = typeof users.$inferSelect;

const users = pgTable("users", {
  id: uuid().defaultRandom().primaryKey(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phoneNumber: text("phone_number").notNull().unique(),
  email: text("email").notNull().unique(),
  verifiedEmail: boolean("verified_email").default(false),
  hashedPassword: text("hashed_password").notNull(),
  ...trackChanges,
});

const selectUsersSchema = createSelectSchema(users);
const insertUsersSchema = createInsertSchema(users, {
  email: (schema) => schema.and(z.email()),
});

export type { User };
export { users, selectUsersSchema, insertUsersSchema };
