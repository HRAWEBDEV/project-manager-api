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
  phoneNumber: text("phone_number").notNull().unique(),
  email: text("email").notNull().unique(),
  hashedPassword: text("hashed_password").notNull(),
  ...trackChanges,
});

function constraintUser(
  data: UserUpdate,
  ctx: z.core.$RefinementCtx<UserUpdate>,
) {
  if (typeof data.firstName === "string" && !data.firstName) {
    ctx.addIssue({ code: "custom", message: "First name is required" });
  }
  if (typeof data.lastName === "string" && !data.lastName) {
    ctx.addIssue({ code: "custom", message: "Last name is required" });
  }
  if (typeof data.email === "string" && !data.email) {
    ctx.addIssue({ code: "custom", message: "Email is required" });
  }
  if (typeof data.phoneNumber === "string" && !data.phoneNumber) {
    ctx.addIssue({ code: "custom", message: "Phone number is required" });
  }
}

const selectUserSchema = createSelectSchema(users);
const insertUserSchema = createInsertSchema(users);
const updateUserSchema = createUpdateSchema(users);

export type { User, UserInsert, UserUpdate };
export {
  constraintUser,
  insertUserSchema,
  selectUserSchema,
  updateUserSchema,
  users,
};
