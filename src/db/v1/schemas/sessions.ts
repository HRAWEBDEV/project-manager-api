import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users.ts";
import { trackChanges } from "../../utils/trackChanges.ts";
import { createSelectSchema } from "drizzle-zod";
import { z } from "zod";

type Session = z.infer<typeof selectSession>;

const sessions = pgTable("sessions", {
  id: uuid().defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  hashedToken: text("hashed_token").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: trackChanges.createdAt,
});

const selectSession = createSelectSchema(sessions);

export { type Session };
export { selectSession, sessions };
