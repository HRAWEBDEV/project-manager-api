import { pgTable, uuid, varchar, text } from "drizzle-orm/pg-core";
import { trackChanges } from "../utils/trackChanges";

type Organization = typeof organizations.$inferSelect;

const organizations = pgTable("organizations", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  slug: varchar("slug", { length: 150 }).notNull().unique(),
  logo: text("logo"),
  description: text("description"),
  ...trackChanges,
});

export type { Organization };
export { organizations };
