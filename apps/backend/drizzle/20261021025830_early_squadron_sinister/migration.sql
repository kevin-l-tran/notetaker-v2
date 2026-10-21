ALTER TYPE "node_type" ADD VALUE 'claim';--> statement-breakpoint
CREATE TABLE "claim_revisions" (
	"base_node_revision_id" uuid PRIMARY KEY,
	"predicate_source" text NOT NULL,
	"result_source" text NOT NULL,
	"justification_source" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "node_drafts" RENAME CONSTRAINT "save_version_nonnegative" TO "save_version_positive";--> statement-breakpoint
ALTER TABLE "node_drafts" DROP COLUMN "title_preview";--> statement-breakpoint
ALTER TABLE "claim_revisions" ADD CONSTRAINT "claim_revisions_DUHtt1RmhLhg_fkey" FOREIGN KEY ("base_node_revision_id") REFERENCES "base_node_revisions"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "node_drafts" DROP CONSTRAINT "save_version_positive", ADD CONSTRAINT "save_version_positive" CHECK ("save_version" > 0);