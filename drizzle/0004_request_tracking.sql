CREATE TABLE "request_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"request_type" varchar(20) NOT NULL,
	"request_id" uuid NOT NULL,
	"kind" varchar(20) NOT NULL,
	"author" varchar(20) NOT NULL,
	"author_user_id" uuid,
	"author_auth_user_id" text,
	"author_name" varchar(180),
	"body" text,
	"status" "submission_status",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "request_events_type_ck" CHECK ("request_events"."request_type" in ('aide', 'benevoles', 'messages')),
	CONSTRAINT "request_events_kind_ck" CHECK ("request_events"."kind" in ('message', 'status')),
	CONSTRAINT "request_events_author_ck" CHECK ("request_events"."author" in ('staff', 'requester')),
	CONSTRAINT "request_events_content_ck" CHECK (("request_events"."kind" = 'message' and "request_events"."body" is not null) or ("request_events"."kind" = 'status' and "request_events"."status" is not null))
);
--> statement-breakpoint
CREATE TABLE "requester_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" varchar(255) NOT NULL,
	"event_id" uuid NOT NULL,
	"request_type" varchar(20) NOT NULL,
	"request_id" uuid NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "request_events" ADD CONSTRAINT "request_events_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "request_events" ADD CONSTRAINT "request_events_author_user_id_users_id_fk" FOREIGN KEY ("author_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requester_notifications" ADD CONSTRAINT "requester_notifications_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requester_notifications" ADD CONSTRAINT "requester_notifications_event_id_request_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."request_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "request_events_request_idx" ON "request_events" USING btree ("request_type","request_id","created_at");--> statement-breakpoint
CREATE INDEX "request_events_requester_idx" ON "request_events" USING btree ("author_auth_user_id","created_at");--> statement-breakpoint
CREATE INDEX "requester_notifications_email_idx" ON "requester_notifications" USING btree ("email","read_at","created_at");