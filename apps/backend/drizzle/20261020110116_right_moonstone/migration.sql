CREATE TABLE "nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"notebook_id" uuid NOT NULL,
	"type" "node_type" NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "base_nodes" RENAME TO "base_node_revisions";--> statement-breakpoint
ALTER TABLE "concepts" RENAME TO "concept_revisions";--> statement-breakpoint
ALTER TABLE "base_node_revisions" DROP CONSTRAINT "base_nodes_notebook_id_notebooks_id_fkey";--> statement-breakpoint
ALTER TABLE "concept_revisions" RENAME COLUMN "base_node_id" TO "base_node_revision_id";--> statement-breakpoint
ALTER TABLE "base_node_revisions" ADD COLUMN "node_id" uuid;--> statement-breakpoint
ALTER TABLE "base_node_revisions" ADD COLUMN "revision_number" integer NOT NULL;--> statement-breakpoint
ALTER TABLE "base_node_revisions" DROP COLUMN "notebook_id";--> statement-breakpoint
ALTER TABLE "base_node_revisions" DROP COLUMN "type";--> statement-breakpoint
ALTER TABLE "base_node_revisions" DROP COLUMN "is_published";--> statement-breakpoint
ALTER TABLE "base_node_revisions" DROP COLUMN "updated_at";--> statement-breakpoint
ALTER TABLE "base_node_revisions" ALTER COLUMN "title" SET DEFAULT 'New Node';--> statement-breakpoint
ALTER TABLE "concept_revisions" ALTER COLUMN "description_source" SET DEFAULT '';--> statement-breakpoint
CREATE UNIQUE INDEX "node_revision_number_idx" ON "base_node_revisions" ("node_id","revision_number");--> statement-breakpoint
ALTER TABLE "base_node_revisions" ADD CONSTRAINT "base_node_revisions_node_id_nodes_id_fkey" FOREIGN KEY ("node_id") REFERENCES "nodes"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "nodes" ADD CONSTRAINT "nodes_notebook_id_notebooks_id_fkey" FOREIGN KEY ("notebook_id") REFERENCES "notebooks"("id") ON DELETE CASCADE;