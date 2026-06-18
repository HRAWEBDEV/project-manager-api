import { boolean, timestamp } from "drizzle-orm/pg-core";

export const trackChanges = {
  createdAt: timestamp("created_at", {
    withTimezone: true,
  }).defaultNow(),
  updatedAt: timestamp("updated_at", {
    withTimezone: true,
  }).defaultNow().$onUpdateFn(() => new Date()),
  deleted: boolean("deleted").default(false),
};
