ALTER TABLE "base_node_revisions" ALTER COLUMN "aliases" SET DATA TYPE jsonb[] USING "aliases"::jsonb[];--> statement-breakpoint
ALTER TABLE "node_drafts" ALTER COLUMN "save_version" SET DEFAULT 1;