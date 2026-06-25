import { pgTable, text, uuid, boolean, varchar } from "drizzle-orm/pg-core";
import { trackChanges } from "../utils/trackChanges";
import { createSelectSchema, createInsertSchema } from "drizzle-zod";
import { z } from "zod";

type User = typeof users.$inferSelect;

const users = pgTable("users", {
  id: uuid().defaultRandom().primaryKey(),
  firstName: varchar("first_name", { length: 255 }).notNull(),
  lastName: varchar("last_name", { length: 255 }).notNull(),
  phoneNumber: varchar("phone_number", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
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
