import { pgTable, text, uuid } from "drizzle-orm/pg-core";
import { trackChanges } from "../../utils/trackChanges.ts";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import { z } from "zod";

type User = z.infer<typeof selectUserSchema>;
type UserInsert = z.infer<typeof insertUserSchema>;
type UserUpdate = z.infer<typeof updateUserSchema>;

const users = pgTable("users", {
  id: uuid().primaryKey().defaultRandom(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  phoneNumber: text("phone_number").notNull(),
  email: text("email"),
  hashedPassword: text("hashed_password").notNull(),
  ...trackChanges,
});

const selectUserSchema = createSelectSchema(users);
const insertUserSchema = createInsertSchema(users);
const updateUserSchema = createUpdateSchema(users);

export type { User, UserInsert, UserUpdate };
export { insertUserSchema, selectUserSchema, updateUserSchema, users };
