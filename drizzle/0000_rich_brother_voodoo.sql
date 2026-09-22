CREATE TABLE `couriers` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`full_name` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`email` text,
	`nationality` text DEFAULT 'RO' NOT NULL,
	`city` text DEFAULT '' NOT NULL,
	`platforms` text DEFAULT '[]' NOT NULL,
	`waitlisted_platforms` text,
	`vehicle_type` text DEFAULT 'scooter' NOT NULL,
	`vehicle_ownership` text DEFAULT 'personal' NOT NULL,
	`collaboration` text DEFAULT 'pfa' NOT NULL,
	`commission_pct` real,
	`weekly_contract_fee_ron` real,
	`bolt_uid` text,
	`iban` text,
	`subcontractor_name` text,
	`status` text DEFAULT 'active' NOT NULL,
	`incomplete_fields` text DEFAULT '[]' NOT NULL,
	`created_at_iso` text DEFAULT (current_timestamp) NOT NULL,
	`created_by` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE TABLE `duplicate_pairs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tenant_id` text NOT NULL,
	`courier_a_id` text NOT NULL,
	`courier_b_id` text NOT NULL,
	`fee_once` real,
	`commission_pct` real,
	`created_at_iso` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`courier_a_id`) REFERENCES `couriers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`courier_b_id`) REFERENCES `couriers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `kv_store` (
	`tenant_id` text NOT NULL,
	`key` text NOT NULL,
	`value` text NOT NULL,
	`updated_at_iso` text DEFAULT (current_timestamp) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant_id` text NOT NULL,
	`fleet_id` text NOT NULL,
	`recipient` text NOT NULL,
	`type` text NOT NULL,
	`period_start_iso` text NOT NULL,
	`period_end_iso` text NOT NULL,
	`payment_date_iso` text NOT NULL,
	`method` text NOT NULL,
	`breakdown` text NOT NULL,
	`amount_paid` real DEFAULT 0 NOT NULL,
	`total_calculated` real DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'in_review' NOT NULL,
	`reference` text,
	`notes` text,
	`created_at_iso` text DEFAULT (current_timestamp) NOT NULL,
	`created_by` text DEFAULT '' NOT NULL,
	`override_reason` text,
	`orders_count` integer,
	`platforms` text,
	`commission_percentage` real,
	`currency` text,
	`iban_snapshot` text,
	`operator_name` text,
	`approved_by` text,
	`approved_at_iso` text,
	`paid_by` text,
	`paid_at_iso` text
);
