import {
  pgTable,
  varchar,
  uuid,
  text,
  timestamp,
  inet,
} from "drizzle-orm/pg-core";
import { users } from "./users";

type Session = typeof sessions.$inferSelect;

const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, {
      onDelete: "cascade",
    }),
  token: text("token").notNull(),
  ipAddress: inet("ip_address"),
  userAgent: text("user_agent"),
  deviceName: varchar("device_name", { length: 100 }),
  expiresAt: timestamp("expires_at", {
    withTimezone: true,
  }).notNull(),
  lastUsedAt: timestamp("last_used_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", {
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});

export type { Session };
export { sessions };
