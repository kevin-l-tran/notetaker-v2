import type { NotebookSettings } from "@notetaker-v2/contracts";
import { jsonb, snakeCase, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const notebooks = snakeCase.table("notebooks", {
	id: uuid().defaultRandom().primaryKey(),
	title: varchar().notNull(),
	description: varchar(),
	settings: jsonb().$type<NotebookSettings>().default({}).notNull(),
	createdAt: timestamp({ precision: 6, withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ precision: 6, withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});

export type Notebooks = typeof notebooks.$inferSelect;
export type NewNotebook = typeof notebooks.$inferInsert;
