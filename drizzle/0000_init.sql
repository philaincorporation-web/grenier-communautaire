CREATE TYPE "public"."aid_request_status" AS ENUM('submitted', 'under_review', 'approved', 'rejected', 'fulfilled', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."distribution_status" AS ENUM('draft', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."donation_status" AS ENUM('draft', 'received', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('owner', 'admin', 'manager', 'member', 'viewer');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_status" AS ENUM('draft', 'posted', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."stock_movement_type" AS ENUM('receipt', 'issue', 'transfer', 'adjustment_in', 'adjustment_out');--> statement-breakpoint
CREATE TABLE "aid_request_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"aid_request_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity_requested" numeric(14, 3) NOT NULL,
	"quantity_approved" numeric(14, 3),
	"notes" text,
	CONSTRAINT "aid_request_items_requested_ck" CHECK ("aid_request_items"."quantity_requested" > 0),
	CONSTRAINT "aid_request_items_approved_ck" CHECK ("aid_request_items"."quantity_approved" is null or "aid_request_items"."quantity_approved" >= 0)
);
--> statement-breakpoint
CREATE TABLE "aid_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"beneficiary_id" uuid NOT NULL,
	"reference" varchar(80) NOT NULL,
	"status" "aid_request_status" DEFAULT 'submitted' NOT NULL,
	"requested_on" date DEFAULT now() NOT NULL,
	"reviewed_by_membership_id" uuid,
	"reviewed_at" timestamp with time zone,
	"decision_note" text,
	"general_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "aid_requests_id_org_uk" UNIQUE("id","organization_id"),
	CONSTRAINT "aid_requests_org_reference_uk" UNIQUE("organization_id","reference")
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"action" varchar(100) NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" uuid,
	"before_data" jsonb,
	"after_data" jsonb,
	"ip_address" "inet",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "beneficiaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"beneficiary_type" varchar(20) NOT NULL,
	"reference" varchar(80),
	"display_name" varchar(180) NOT NULL,
	"phone" varchar(40),
	"email" varchar(255),
	"address" text,
	"household_size" integer,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beneficiaries_id_org_uk" UNIQUE("id","organization_id"),
	CONSTRAINT "beneficiaries_org_reference_uk" UNIQUE("organization_id","reference"),
	CONSTRAINT "beneficiaries_type_ck" CHECK ("beneficiaries"."beneficiary_type" in ('individual', 'household', 'organization')),
	CONSTRAINT "beneficiaries_household_size_ck" CHECK ("beneficiaries"."household_size" is null or "beneficiaries"."household_size" > 0)
);
--> statement-breakpoint
CREATE TABLE "distribution_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"distribution_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	"notes" text,
	CONSTRAINT "distribution_items_quantity_ck" CHECK ("distribution_items"."quantity" > 0)
);
--> statement-breakpoint
CREATE TABLE "distributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"beneficiary_id" uuid NOT NULL,
	"aid_request_id" uuid,
	"warehouse_id" uuid NOT NULL,
	"reference" varchar(80) NOT NULL,
	"status" "distribution_status" DEFAULT 'draft' NOT NULL,
	"distributed_on" date DEFAULT now() NOT NULL,
	"distributed_by_membership_id" uuid,
	"recipient_acknowledgement" text,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "distributions_id_org_uk" UNIQUE("id","organization_id"),
	CONSTRAINT "distributions_org_reference_uk" UNIQUE("organization_id","reference")
);
--> statement-breakpoint
CREATE TABLE "donation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"donation_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	"estimated_unit_value" numeric(14, 2),
	"notes" text,
	CONSTRAINT "donation_items_quantity_ck" CHECK ("donation_items"."quantity" > 0),
	CONSTRAINT "donation_items_value_ck" CHECK ("donation_items"."estimated_unit_value" is null or "donation_items"."estimated_unit_value" >= 0)
);
--> statement-breakpoint
CREATE TABLE "donors_donations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"donor_id" uuid NOT NULL,
	"reference" varchar(80),
	"received_on" date DEFAULT now() NOT NULL,
	"status" "donation_status" DEFAULT 'draft' NOT NULL,
	"notes" text,
	"received_by_membership_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "donations_id_org_uk" UNIQUE("id","organization_id"),
	CONSTRAINT "donations_org_reference_uk" UNIQUE("organization_id","reference")
);
--> statement-breakpoint
CREATE TABLE "donors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"donor_type" varchar(20) NOT NULL,
	"display_name" varchar(180) NOT NULL,
	"email" varchar(255),
	"phone" varchar(40),
	"address" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "donors_id_org_uk" UNIQUE("id","organization_id"),
	CONSTRAINT "donors_type_ck" CHECK ("donors"."donor_type" in ('individual', 'organization'))
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "member_role" DEFAULT 'member' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "memberships_org_user_uk" UNIQUE("organization_id","user_id"),
	CONSTRAINT "memberships_id_org_uk" UNIQUE("id","organization_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(180) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"email" varchar(255),
	"phone" varchar(40),
	"address" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "product_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_categories_id_org_uk" UNIQUE("id","organization_id"),
	CONSTRAINT "product_categories_org_name_uk" UNIQUE("organization_id","name")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"category_id" uuid,
	"sku" varchar(80),
	"name" varchar(180) NOT NULL,
	"description" text,
	"unit" varchar(40) NOT NULL,
	"is_perishable" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "products_id_org_uk" UNIQUE("id","organization_id"),
	CONSTRAINT "products_org_sku_uk" UNIQUE("organization_id","sku")
);
--> statement-breakpoint
CREATE TABLE "stock_movement_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"movement_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"quantity" numeric(14, 3) NOT NULL,
	"unit_value" numeric(14, 2),
	"lot_number" varchar(100),
	"expires_on" date,
	"notes" text,
	CONSTRAINT "stock_movement_items_quantity_ck" CHECK ("stock_movement_items"."quantity" > 0),
	CONSTRAINT "stock_movement_items_value_ck" CHECK ("stock_movement_items"."unit_value" is null or "stock_movement_items"."unit_value" >= 0)
);
--> statement-breakpoint
CREATE TABLE "stock_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"movement_type" "stock_movement_type" NOT NULL,
	"status" "stock_movement_status" DEFAULT 'draft' NOT NULL,
	"reference" varchar(80) NOT NULL,
	"source_warehouse_id" uuid,
	"destination_warehouse_id" uuid,
	"donation_id" uuid,
	"performed_by_membership_id" uuid,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stock_movements_id_org_uk" UNIQUE("id","organization_id"),
	CONSTRAINT "stock_movements_org_reference_uk" UNIQUE("organization_id","reference"),
	CONSTRAINT "stock_movements_distinct_warehouses_ck" CHECK ("stock_movements"."source_warehouse_id" is distinct from "stock_movements"."destination_warehouse_id"),
	CONSTRAINT "stock_movements_warehouse_rules_ck" CHECK ((
    ("stock_movements"."movement_type" in ('receipt','adjustment_in') and "stock_movements"."destination_warehouse_id" is not null and "stock_movements"."source_warehouse_id" is null)
    or ("stock_movements"."movement_type" in ('issue','adjustment_out') and "stock_movements"."source_warehouse_id" is not null and "stock_movements"."destination_warehouse_id" is null)
    or ("stock_movements"."movement_type" = 'transfer' and "stock_movements"."source_warehouse_id" is not null and "stock_movements"."destination_warehouse_id" is not null)
  ))
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"full_name" varchar(180) NOT NULL,
	"phone" varchar(40),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(160) NOT NULL,
	"code" varchar(60),
	"address" text,
	"manager_membership_id" uuid,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "warehouses_id_org_uk" UNIQUE("id","organization_id"),
	CONSTRAINT "warehouses_org_code_uk" UNIQUE("organization_id","code")
);
--> statement-breakpoint
ALTER TABLE "aid_request_items" ADD CONSTRAINT "aid_request_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aid_request_items" ADD CONSTRAINT "aid_request_items_request_org_fk" FOREIGN KEY ("aid_request_id","organization_id") REFERENCES "public"."aid_requests"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aid_request_items" ADD CONSTRAINT "aid_request_items_product_org_fk" FOREIGN KEY ("product_id","organization_id") REFERENCES "public"."products"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aid_requests" ADD CONSTRAINT "aid_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aid_requests" ADD CONSTRAINT "aid_requests_beneficiary_org_fk" FOREIGN KEY ("beneficiary_id","organization_id") REFERENCES "public"."beneficiaries"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "aid_requests" ADD CONSTRAINT "aid_requests_reviewer_org_fk" FOREIGN KEY ("reviewed_by_membership_id","organization_id") REFERENCES "public"."memberships"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beneficiaries" ADD CONSTRAINT "beneficiaries_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_items" ADD CONSTRAINT "distribution_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_items" ADD CONSTRAINT "distribution_items_distribution_org_fk" FOREIGN KEY ("distribution_id","organization_id") REFERENCES "public"."distributions"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distribution_items" ADD CONSTRAINT "distribution_items_product_org_fk" FOREIGN KEY ("product_id","organization_id") REFERENCES "public"."products"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distributions" ADD CONSTRAINT "distributions_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distributions" ADD CONSTRAINT "distributions_beneficiary_org_fk" FOREIGN KEY ("beneficiary_id","organization_id") REFERENCES "public"."beneficiaries"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distributions" ADD CONSTRAINT "distributions_request_org_fk" FOREIGN KEY ("aid_request_id","organization_id") REFERENCES "public"."aid_requests"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distributions" ADD CONSTRAINT "distributions_warehouse_org_fk" FOREIGN KEY ("warehouse_id","organization_id") REFERENCES "public"."warehouses"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "distributions" ADD CONSTRAINT "distributions_actor_org_fk" FOREIGN KEY ("distributed_by_membership_id","organization_id") REFERENCES "public"."memberships"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donation_items" ADD CONSTRAINT "donation_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donation_items" ADD CONSTRAINT "donation_items_donation_org_fk" FOREIGN KEY ("donation_id","organization_id") REFERENCES "public"."donors_donations"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donation_items" ADD CONSTRAINT "donation_items_product_org_fk" FOREIGN KEY ("product_id","organization_id") REFERENCES "public"."products"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donors_donations" ADD CONSTRAINT "donors_donations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donors_donations" ADD CONSTRAINT "donations_donor_org_fk" FOREIGN KEY ("donor_id","organization_id") REFERENCES "public"."donors"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donors_donations" ADD CONSTRAINT "donations_receiver_org_fk" FOREIGN KEY ("received_by_membership_id","organization_id") REFERENCES "public"."memberships"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donors" ADD CONSTRAINT "donors_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_org_fk" FOREIGN KEY ("category_id","organization_id") REFERENCES "public"."product_categories"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement_items" ADD CONSTRAINT "stock_movement_items_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement_items" ADD CONSTRAINT "stock_movement_items_movement_org_fk" FOREIGN KEY ("movement_id","organization_id") REFERENCES "public"."stock_movements"("id","organization_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movement_items" ADD CONSTRAINT "stock_movement_items_product_org_fk" FOREIGN KEY ("product_id","organization_id") REFERENCES "public"."products"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_source_org_fk" FOREIGN KEY ("source_warehouse_id","organization_id") REFERENCES "public"."warehouses"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_destination_org_fk" FOREIGN KEY ("destination_warehouse_id","organization_id") REFERENCES "public"."warehouses"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_donation_org_fk" FOREIGN KEY ("donation_id","organization_id") REFERENCES "public"."donors_donations"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_actor_org_fk" FOREIGN KEY ("performed_by_membership_id","organization_id") REFERENCES "public"."memberships"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_manager_org_fk" FOREIGN KEY ("manager_membership_id","organization_id") REFERENCES "public"."memberships"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "aid_request_items_request_idx" ON "aid_request_items" USING btree ("aid_request_id");--> statement-breakpoint
CREATE INDEX "aid_requests_org_status_idx" ON "aid_requests" USING btree ("organization_id","status","requested_on");--> statement-breakpoint
CREATE INDEX "audit_logs_org_date_idx" ON "audit_logs" USING btree ("organization_id","created_at");--> statement-breakpoint
CREATE INDEX "beneficiaries_org_name_idx" ON "beneficiaries" USING btree ("organization_id","display_name");--> statement-breakpoint
CREATE INDEX "distribution_items_distribution_idx" ON "distribution_items" USING btree ("distribution_id");--> statement-breakpoint
CREATE INDEX "distributions_org_date_idx" ON "distributions" USING btree ("organization_id","distributed_on");--> statement-breakpoint
CREATE INDEX "donation_items_donation_idx" ON "donation_items" USING btree ("donation_id");--> statement-breakpoint
CREATE INDEX "donations_org_date_idx" ON "donors_donations" USING btree ("organization_id","received_on");--> statement-breakpoint
CREATE INDEX "donors_org_name_idx" ON "donors" USING btree ("organization_id","display_name");--> statement-breakpoint
CREATE INDEX "memberships_user_idx" ON "memberships" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "products_org_name_idx" ON "products" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "stock_movement_items_product_idx" ON "stock_movement_items" USING btree ("organization_id","product_id");--> statement-breakpoint
CREATE INDEX "stock_movements_org_date_idx" ON "stock_movements" USING btree ("organization_id","occurred_at");--> statement-breakpoint
CREATE INDEX "warehouses_org_idx" ON "warehouses" USING btree ("organization_id");