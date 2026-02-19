import { pgTable, text, uuid } from "drizzle-orm/pg-core";

const tags = pgTable("tags", {
  id: uuid().defaultRandom().primaryKey(),
  title: text().notNull(),
});

export { tags };
