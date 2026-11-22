CREATE TYPE "public"."submission_status" AS ENUM('new', 'in_progress', 'processed', 'archived');--> statement-breakpoint
CREATE TABLE "contact_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"full_name" varchar(180) NOT NULL,
	"email" varchar(255) NOT NULL,
	"subject" varchar(40) NOT NULL,
	"message" text NOT NULL,
	"status" "submission_status" DEFAULT 'new' NOT NULL,
	"processed_at" timestamp with time zone,
	"ip_hash" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "newsletter_subscribers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"subscribed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"unsubscribed_at" timestamp with time zone,
	"ip_hash" varchar(64),
	CONSTRAINT "newsletter_subscribers_org_email_uk" UNIQUE("organization_id","email")
);
--> statement-breakpoint
CREATE TABLE "public_aid_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"reference" varchar(80) NOT NULL,
	"full_name" varchar(180) NOT NULL,
	"phone" varchar(40) NOT NULL,
	"email" varchar(255),
	"address" text,
	"household_size" integer,
	"needs" text[] DEFAULT '{}'::text[] NOT NULL,
	"message" text,
	"consent_at" timestamp with time zone NOT NULL,
	"status" "submission_status" DEFAULT 'new' NOT NULL,
	"aid_request_id" uuid,
	"processed_at" timestamp with time zone,
	"ip_hash" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "public_aid_requests_org_reference_uk" UNIQUE("organization_id","reference"),
	CONSTRAINT "public_aid_requests_household_ck" CHECK ("public_aid_requests"."household_size" is null or "public_aid_requests"."household_size" > 0)
);
--> statement-breakpoint
CREATE TABLE "volunteer_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"full_name" varchar(180) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(40),
	"role" varchar(40) NOT NULL,
	"area" varchar(180),
	"message" text,
	"status" "submission_status" DEFAULT 'new' NOT NULL,
	"processed_at" timestamp with time zone,
	"ip_hash" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "contact_messages" ADD CONSTRAINT "contact_messages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "newsletter_subscribers" ADD CONSTRAINT "newsletter_subscribers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_aid_requests" ADD CONSTRAINT "public_aid_requests_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "public_aid_requests" ADD CONSTRAINT "public_aid_requests_aid_request_org_fk" FOREIGN KEY ("aid_request_id","organization_id") REFERENCES "public"."aid_requests"("id","organization_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "volunteer_applications" ADD CONSTRAINT "volunteer_applications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "contact_messages_org_status_idx" ON "contact_messages" USING btree ("organization_id","status","created_at");--> statement-breakpoint
CREATE INDEX "contact_messages_ip_idx" ON "contact_messages" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE INDEX "newsletter_subscribers_ip_idx" ON "newsletter_subscribers" USING btree ("ip_hash","subscribed_at");--> statement-breakpoint
CREATE INDEX "public_aid_requests_org_status_idx" ON "public_aid_requests" USING btree ("organization_id","status","created_at");--> statement-breakpoint
CREATE INDEX "public_aid_requests_ip_idx" ON "public_aid_requests" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE INDEX "volunteer_applications_org_status_idx" ON "volunteer_applications" USING btree ("organization_id","status","created_at");--> statement-breakpoint
CREATE INDEX "volunteer_applications_ip_idx" ON "volunteer_applications" USING btree ("ip_hash","created_at");