import { integer, snakeCase, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { nodes } from "./node.ts";

export const baseNodeRevisions = snakeCase.table(
	"base_node_revisions",
	{
		id: uuid().defaultRandom().primaryKey(),
		nodeId: uuid().references(() => nodes.id, { onDelete: "cascade" }),
		revisionNumber: integer("revision_number").notNull(),
		title: varchar().notNull().default("New Node"),
		aliases: varchar().array().notNull().default([]),
		createdAt: timestamp({ precision: 6, withTimezone: true }).defaultNow().notNull(),
	},
	(t) => [uniqueIndex("node_revision_number_idx").on(t.nodeId, t.revisionNumber)],
);

export type BaseNodeRevision = typeof baseNodeRevisions.$inferSelect;
export type NewBaseNodeRevision = typeof baseNodeRevisions.$inferInsert;
