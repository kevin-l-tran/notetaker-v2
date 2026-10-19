ALTER TABLE "base_nodes" ADD COLUMN "is_published" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "base_nodes" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "node_type";--> statement-breakpoint
CREATE TYPE "node_type" AS ENUM('concept');--> statement-breakpoint
ALTER TABLE "base_nodes" ALTER COLUMN "type" SET DATA TYPE "node_type" USING "type"::"node_type";