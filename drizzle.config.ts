import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/v1/schemas",
  dbCredentials: {
    url: Deno.env.get("DATABASE_URL")!,
  },
  schemaFilter: ["public"],
});
