CREATE TABLE "node_drafts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"node_id" uuid NOT NULL UNIQUE,
	"yjs_state" bytea NOT NULL,
	"save_version" integer DEFAULT 0 NOT NULL,
	"title_preview" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "save_version_nonnegative" CHECK ("save_version" >= 0)
);
--> statement-breakpoint
DROP INDEX "node_revision_number_idx";--> statement-breakpoint
ALTER TABLE "base_node_revisions" ALTER COLUMN "node_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "base_node_revisions" ALTER COLUMN "title" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "base_node_revisions" ALTER COLUMN "aliases" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "concept_revisions" ALTER COLUMN "description_source" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "base_node_revisions" ADD CONSTRAINT "base_node_revisions_node_id_revision_number_unique" UNIQUE("node_id","revision_number");--> statement-breakpoint
CREATE INDEX "nodes_notebook_id_index" ON "nodes" ("notebook_id");--> statement-breakpoint
ALTER TABLE "node_drafts" ADD CONSTRAINT "node_drafts_node_id_nodes_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "base_node_revisions" ADD CONSTRAINT "revision_number_positive" CHECK ("revision_number" > 0);