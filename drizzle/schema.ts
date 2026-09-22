import { sqliteTable, AnySQLiteColumn, text, real, foreignKey, integer } from "drizzle-orm/sqlite-core"
  import { sql } from "drizzle-orm"

export const couriers = sqliteTable("couriers", {
	id: text().primaryKey().notNull(),
	tenantId: text("tenant_id").notNull(),
	fullName: text("full_name").notNull(),
	phone: text().default("").notNull(),
	email: text(),
	nationality: text().default("RO").notNull(),
	city: text().default("").notNull(),
	platforms: text().default("[]").notNull(),
	waitlistedPlatforms: text("waitlisted_platforms"),
	vehicleType: text("vehicle_type").default("scooter").notNull(),
	vehicleOwnership: text("vehicle_ownership").default("personal").notNull(),
	collaboration: text().default("pfa").notNull(),
	commissionPct: real("commission_pct"),
	weeklyContractFeeRon: real("weekly_contract_fee_ron"),
	boltUid: text("bolt_uid"),
	iban: text(),
	subcontractorName: text("subcontractor_name"),
	status: text().default("active").notNull(),
	incompleteFields: text("incomplete_fields").default("[]").notNull(),
	createdAtIso: text("created_at_iso").default("sql`(current_timestamp)`").notNull(),
	createdBy: text("created_by").default("").notNull(),
});

export const duplicatePairs = sqliteTable("duplicate_pairs", {
	id: integer().primaryKey({ autoIncrement: true }).notNull(),
	tenantId: text("tenant_id").notNull(),
	courierAId: text("courier_a_id").notNull().references(() => couriers.id, { onDelete: "cascade" } ),
	courierBId: text("courier_b_id").notNull().references(() => couriers.id, { onDelete: "cascade" } ),
	feeOnce: real("fee_once"),
	commissionPct: real("commission_pct"),
	createdAtIso: text("created_at_iso").default("sql`(current_timestamp)`").notNull(),
});

export const kvStore = sqliteTable("kv_store", {
	tenantId: text("tenant_id").notNull(),
	key: text().notNull(),
	value: text().notNull(),
	updatedAtIso: text("updated_at_iso").default("sql`(current_timestamp)`").notNull(),
});

export const payments = sqliteTable("payments", {
	id: text().primaryKey().notNull(),
	tenantId: text("tenant_id").notNull(),
	fleetId: text("fleet_id").notNull(),
	recipient: text().notNull(),
	type: text().notNull(),
	periodStartIso: text("period_start_iso").notNull(),
	periodEndIso: text("period_end_iso").notNull(),
	paymentDateIso: text("payment_date_iso").notNull(),
	method: text().notNull(),
	breakdown: text().notNull(),
	amountPaid: real("amount_paid").notNull(),
	totalCalculated: real("total_calculated").notNull(),
	status: text().default("in_review").notNull(),
	reference: text(),
	notes: text(),
	createdAtIso: text("created_at_iso").default("sql`(current_timestamp)`").notNull(),
	createdBy: text("created_by").default("").notNull(),
	overrideReason: text("override_reason"),
	ordersCount: integer("orders_count"),
	platforms: text(),
	commissionPercentage: real("commission_percentage"),
	currency: text(),
	ibanSnapshot: text("iban_snapshot"),
	operatorName: text("operator_name"),
	approvedBy: text("approved_by"),
	approvedAtIso: text("approved_at_iso"),
	paidBy: text("paid_by"),
	paidAtIso: text("paid_at_iso"),
});

