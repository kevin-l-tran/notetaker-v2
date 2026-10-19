import { snakeCase, text, uuid } from "drizzle-orm/pg-core";
import { baseNodeRevisions } from "./baseNodeRevisions.ts";

export const concepts = snakeCase.table("concept_revisions", {
	baseNodeId: uuid()
		.references(() => baseNodeRevisions.id, { onDelete: "cascade" })
		.primaryKey(),
	descriptionSource: text().notNull().default(""),
});

export type Concept = typeof concepts.$inferSelect;
export type NewConcept = typeof concepts.$inferInsert;
