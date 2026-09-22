import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ── COURIERS ──────────────────────────────────────────────────────────────
export const couriers = sqliteTable("couriers", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  fullName: text("full_name").notNull(),
  phone: text("phone").notNull().default(""),
  email: text("email"),
  nationality: text("nationality").notNull().default("RO"),
  city: text("city").notNull().default(""),
  platforms: text("platforms").notNull().default("[]"),
  waitlistedPlatforms: text("waitlisted_platforms"),
  vehicleType: text("vehicle_type").notNull().default("scooter"),
  vehicleOwnership: text("vehicle_ownership").notNull().default("personal"),
  collaboration: text("collaboration").notNull().default("pfa"),
  commissionPct: real("commission_pct"),
  weeklyContractFeeRon: real("weekly_contract_fee_ron"),
  boltUid: text("bolt_uid"),
  iban: text("iban"),
  subcontractorName: text("subcontractor_name"),
  status: text("status").notNull().default("active"),
  incompleteFields: text("incomplete_fields").notNull().default("[]"),
  createdAtIso: text("created_at_iso").notNull().default(sql`(current_timestamp)`),
  createdBy: text("created_by").notNull().default(""),
});

// ── PAYMENTS ──────────────────────────────────────────────────────────────
export const payments = sqliteTable("payments", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull(),
  fleetId: text("fleet_id").notNull(),
  recipient: text("recipient").notNull(),
  type: text("type").notNull(),
  periodStartIso: text("period_start_iso").notNull(),
  periodEndIso: text("period_end_iso").notNull(),
  paymentDateIso: text("payment_date_iso").notNull(),
  method: text("method").notNull(),
  breakdown: text("breakdown").notNull(),
  amountPaid: real("amount_paid").notNull().default(0),
  totalCalculated: real("total_calculated").notNull().default(0),
  status: text("status").notNull().default("in_review"),
  reference: text("reference"),
  notes: text("notes"),
  createdAtIso: text("created_at_iso").notNull().default(sql`(current_timestamp)`),
  createdBy: text("created_by").notNull().default(""),
  overrideReason: text("override_reason"),
  ordersCount: integer("orders_count"),
  platforms: text("platforms"),
  commissionPercentage: real("commission_percentage"),
  currency: text("currency"),
  ibanSnapshot: text("iban_snapshot"),
  operatorName: text("operator_name"),
  approvedBy: text("approved_by"),
  approvedAtIso: text("approved_at_iso"),
  paidBy: text("paid_by"),
  paidAtIso: text("paid_at_iso"),
});

// ── DUPLICATE PAIRS (cont dublu) ──────────────────────────────────────────
export const duplicatePairs = sqliteTable("duplicate_pairs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").notNull(),
  courierAId: text("courier_a_id").notNull(),
  courierBId: text("courier_b_id").notNull(),
  feeOnce: real("fee_once"),
  commissionPct: real("commission_pct"),
  createdAtIso: text("created_at_iso").notNull().default(sql`(current_timestamp)`),
});

// ── COURIER DOCUMENTS (poze + PDFs stocate în R2) ─────────────────────────
export const courierDocuments = sqliteTable("courier_documents", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").notNull().default("fleet_dragons"),
  courierId: text("courier_id").notNull(),
  docType: text("doc_type").notNull(),        // "ci", "permis", "contract", "medical", "asigurare", "foto", "alt"
  filename: text("filename").notNull(),
  r2Key: text("r2_key").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull().default(0),
  uploadedAtIso: text("uploaded_at_iso").notNull().default(sql`(current_timestamp)`),
  uploadedBy: text("uploaded_by").default(""),
});

// ── USERS + SESSIONS ──────────────────────────────────────────────────────
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"),   // "global_owner" | "user"
  name: text("name").notNull().default(""),
  active: integer("active", { mode: "boolean" }).notNull().default(true),
  createdAtIso: text("created_at_iso").notNull().default(sql`(current_timestamp)`),
  lastLoginIso: text("last_login_iso"),
});

export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  userId: text("user_id").notNull(),
  createdAtIso: text("created_at_iso").notNull().default(sql`(current_timestamp)`),
  expiresAtIso: text("expires_at_iso").notNull(),
  userAgent: text("user_agent"),
  ip: text("ip"),
});

// ── BACKUP SNAPSHOTS ──────────────────────────────────────────────────────
// Fiecare rând = o versiune completă a datelor (toate cheile crm31-*).
// Cea mai recentă e folosită la auto-restore când localStorage e gol.
export const backupSnapshots = sqliteTable("backup_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tenantId: text("tenant_id").notNull().default("fleet_dragons"),
  createdAtIso: text("created_at_iso").notNull().default(sql`(current_timestamp)`),
  keys: text("keys").notNull(),          // JSON: Record<string, string>
  itemCount: integer("item_count").notNull().default(0),
  sizeBytes: integer("size_bytes").notNull().default(0),
  isShrunk: integer("is_shrunk", { mode: "boolean" }).notNull().default(false),
});
