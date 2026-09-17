CREATE TYPE "notebook_member_role" AS ENUM('owner', 'editor', 'viewer');--> statement-breakpoint
CREATE TABLE "notebook_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"app_user_id" uuid NOT NULL,
	"notebook_id" uuid NOT NULL,
	"role" "notebook_member_role" NOT NULL,
	CONSTRAINT "notebook_members_app_user_id_notebook_id_unique" UNIQUE("app_user_id","notebook_id")
);
--> statement-breakpoint
CREATE TABLE "notebooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"title" varchar NOT NULL,
	"description" text,
	"settings" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "notebook_members" ADD CONSTRAINT "notebook_members_app_user_id_app_users_id_fkey" FOREIGN KEY ("app_user_id") REFERENCES "app_users"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "notebook_members" ADD CONSTRAINT "notebook_members_notebook_id_notebooks_id_fkey" FOREIGN KEY ("notebook_id") REFERENCES "notebooks"("id") ON DELETE CASCADE;