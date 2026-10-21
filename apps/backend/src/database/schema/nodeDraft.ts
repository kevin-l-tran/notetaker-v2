import { sql } from "drizzle-orm";
import { bytea, check, integer, snakeCase, timestamp, uuid } from "drizzle-orm/pg-core";
import { nodes } from "./node.ts";

export const nodeDrafts = snakeCase.table(
	"node_drafts",
	{
		id: uuid().primaryKey().defaultRandom(),
		nodeId: uuid()
			.notNull()
			.unique()
			.references(() => nodes.id, { onDelete: "cascade" }),
		yjsState: bytea().notNull(),
		saveVersion: integer().notNull().default(0),
		createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp({ withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(t) => [check("save_version_positive", sql`${t.saveVersion} > 0`)],
);

export type NodeDraft = typeof nodeDrafts.$inferSelect;
export type NewNodeDraft = typeof nodeDrafts.$inferInsert;
