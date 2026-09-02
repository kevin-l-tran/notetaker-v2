CREATE TYPE "auth_provider" AS ENUM('better-auth');--> statement-breakpoint
CREATE TABLE "app_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"display_name" varchar,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_identities" (
	"id" uuid DEFAULT gen_random_uuid() NOT NULL,
	"app_user_id" uuid NOT NULL,
	"provider" "auth_provider",
	"provider_subject" text,
	CONSTRAINT "auth_identities_pkey" PRIMARY KEY("provider","provider_subject")
);
--> statement-breakpoint
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_app_user_id_app_users_id_fkey" FOREIGN KEY ("app_user_id") REFERENCES "app_users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_provider_subject_user_id_fkey" FOREIGN KEY ("provider_subject") REFERENCES "user"("id") ON DELETE CASCADE;