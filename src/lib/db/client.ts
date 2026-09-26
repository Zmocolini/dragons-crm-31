import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

// Client unic pentru toată aplicația. Merge cu:
//   - LOCAL: TURSO_DATABASE_URL="file:.data/crm31.db"  (SQLite pe disk)
//   - PROD Vercel: TURSO_DATABASE_URL="libsql://...turso.io" + TURSO_AUTH_TOKEN
//
// Așa același cod rulează local și pe Vercel fără schimbări.

const url = process.env.TURSO_DATABASE_URL ?? "file:.data/crm31.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const libsql = createClient({ url, ...(authToken ? { authToken } : {}) });
export const db = drizzle(libsql, { schema });
export { schema };
/** Client libsql brut — pentru batch-uri SQL (ex. /api/sync). */
export const rawDb = libsql;
