import { pgEnum, snakeCase, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { notebooks } from "./notebooks.ts";

export const nodeType = pgEnum("node_type", ["concept"]);

export const baseNodeRevisions = snakeCase.table("base_node_revisions", {
	id: uuid().defaultRandom().primaryKey(),
	notebookId: uuid()
		.references(() => notebooks.id, { onDelete: "cascade" })
		.notNull(),
	type: nodeType().notNull(),
	title: varchar().notNull().default("New Node"),
	aliases: varchar().array().notNull().default([]),
	createdAt: timestamp({ precision: 6, withTimezone: true }).defaultNow().notNull(),
});

export type BaseNodeRevision = typeof baseNodeRevisions.$inferSelect;
export type NewBaseNodeRevision = typeof baseNodeRevisions.$inferInsert;
