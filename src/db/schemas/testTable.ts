import { pgTable, varchar } from "drizzle-orm/pg-core";

export const testTable = pgTable("test_table", {
  test: varchar({ length: 10 }),
});
