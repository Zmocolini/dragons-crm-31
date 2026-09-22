import "dotenv/config";
import type { Config } from "drizzle-kit";

const url = process.env.TURSO_DATABASE_URL ?? "file:.data/crm31.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url,
    ...(authToken ? { authToken } : {}),
  },
  verbose: true,
  strict: true,
} satisfies Config;
