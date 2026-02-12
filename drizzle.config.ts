import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schemas",
  dbCredentials: {
    url: Deno.env.get("DATABASE_URL")!,
  },
});
