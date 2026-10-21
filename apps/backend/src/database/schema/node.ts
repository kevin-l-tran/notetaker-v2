import { index, pgEnum, snakeCase, timestamp, uuid } from "drizzle-orm/pg-core";
import { notebooks } from "./notebooks.ts";

export const nodeType = pgEnum("node_type", ["concept", "claim"]);

export const nodes = snakeCase.table(
	"nodes",
	{
		id: uuid().defaultRandom().primaryKey(),
		notebookId: uuid()
			.references(() => notebooks.id, { onDelete: "cascade" })
			.notNull(),
		type: nodeType().notNull(),
		createdAt: timestamp({ precision: 6, withTimezone: true }).defaultNow().notNull(),
	},
	(table) => [index().on(table.notebookId)],
);

export type Node = typeof nodes.$inferSelect;
export type NewNode = typeof nodes.$inferInsert;
