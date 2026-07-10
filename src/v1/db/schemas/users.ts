import { pgTable, uuid, varchar, text, boolean } from "drizzle-orm/pg-core";
import { trackChanges } from "../utils/trackChanges";
import { createInsertSchema } from "drizzle-zod";

type User = typeof users.$inferSelect;
type InsertUser = typeof users.$inferInsert;

const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phoneNumber: varchar("phone_number", { length: 20 }).unique(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  avatar: text("avatar"),
  hashedPassword: text("hashed_password").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  phoneNumberVerified: boolean("phone_number_verified")
    .notNull()
    .default(false),
  active: boolean("active").default(true),
  ...trackChanges,
});

const insertUserSchema = createInsertSchema(users);

export type { User, InsertUser };
export { users, insertUserSchema };
