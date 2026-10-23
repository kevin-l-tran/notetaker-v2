import { sql } from "drizzle-orm";
import {
	check,
	integer,
	jsonb,
	snakeCase,
	timestamp,
	unique,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";
import { nodes } from "./node.ts";

export const baseNodeRevisions = snakeCase.table(
	"base_node_revisions",
	{
		id: uuid().defaultRandom().primaryKey(),
		nodeId: uuid()
			.notNull()
			.references(() => nodes.id, { onDelete: "cascade" }),
		revisionNumber: integer("revision_number").notNull(),
		title: varchar().notNull(),
		aliases: jsonb().$type<{ text: string; mode: "auto" | "manual" }>().array().notNull(),
		createdAt: timestamp({ precision: 6, withTimezone: true }).notNull().defaultNow(),
	},
	(t) => [
		unique().on(t.nodeId, t.revisionNumber),
		check("revision_number_positive", sql`${t.revisionNumber} > 0`),
	],
);

export type BaseNodeRevision = typeof baseNodeRevisions.$inferSelect;
export type NewBaseNodeRevision = typeof baseNodeRevisions.$inferInsert;
