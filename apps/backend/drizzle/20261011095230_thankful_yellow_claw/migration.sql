ALTER TABLE "concepts" DROP COLUMN "id";--> statement-breakpoint
ALTER TABLE "concepts" ADD PRIMARY KEY ("base_node_id");--> statement-breakpoint
ALTER TABLE "base_nodes" ALTER COLUMN "aliases" SET DEFAULT '{}'::varchar[];