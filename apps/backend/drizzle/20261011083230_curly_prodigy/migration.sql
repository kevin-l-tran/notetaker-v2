CREATE TYPE "node_type" AS ENUM('claim', 'concept');--> statement-breakpoint
CREATE TABLE "base_nodes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"notebook_id" uuid NOT NULL,
	"type" "node_type" NOT NULL,
	"title" varchar NOT NULL,
	"aliases" varchar[] NOT NULL,
	"created_at" timestamp(6) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(6) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "concepts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
	"base_node_id" uuid NOT NULL,
	"description_source" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "base_nodes" ADD CONSTRAINT "base_nodes_notebook_id_notebooks_id_fkey" FOREIGN KEY ("notebook_id") REFERENCES "notebooks"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "concepts" ADD CONSTRAINT "concepts_base_node_id_base_nodes_id_fkey" FOREIGN KEY ("base_node_id") REFERENCES "base_nodes"("id") ON DELETE CASCADE;