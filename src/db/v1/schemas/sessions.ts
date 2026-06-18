import { pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./users";
import { trackChanges } from "../utils/trackChanges";

type Session = typeof sessions.$inferSelect;

const sessions = pgTable("sessions", {
  id: uuid().defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
    }),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  token: text("hashed_token").notNull(),
  expiresAt: timestamp("expires_at", {
    withTimezone: true,
  }).notNull(),
  createdAt: trackChanges.createdAt,
});

export type { Session };
export { sessions };
