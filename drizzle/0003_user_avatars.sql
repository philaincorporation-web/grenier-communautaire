CREATE TABLE "user_avatars" (
	"auth_user_id" text PRIMARY KEY NOT NULL,
	"mime_type" varchar(40) NOT NULL,
	"data" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_avatars_mime_ck" CHECK ("user_avatars"."mime_type" in ('image/jpeg', 'image/png', 'image/webp'))
);
