import { snakeCase, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { notebooks } from "./notebooks.ts";

export const baseNodes = snakeCase.table("base_nodes", {
	id: uuid().defaultRandom().primaryKey(),
	notebookId: uuid()
		.references(() => notebooks.id, { onDelete: "cascade" })
		.notNull(),
	title: varchar().notNull(),
	aliases: varchar().array().notNull(),
	createdAt: timestamp({ precision: 6, withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ precision: 6, withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

export type BaseNode = typeof baseNodes.$inferSelect;
export type NewBaseNode = typeof baseNodes.$inferInsert;
