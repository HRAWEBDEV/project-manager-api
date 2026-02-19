import { pgTable, text, uuid } from "drizzle-orm/pg-core";

const status = pgTable("status", {
  id: uuid().defaultRandom().primaryKey(),
  title: text().notNull(),
});

export { status };
