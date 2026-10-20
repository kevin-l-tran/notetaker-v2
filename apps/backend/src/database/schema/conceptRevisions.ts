import { snakeCase, text, uuid } from "drizzle-orm/pg-core";
import { baseNodeRevisions } from "./baseNodeRevisions.ts";

export const conceptRevisions = snakeCase.table("concept_revisions", {
	baseNodeRevisionId: uuid()
		.references(() => baseNodeRevisions.id, { onDelete: "cascade" })
		.primaryKey(),
	descriptionSource: text().notNull().default(""),
});

export type ConceptRevision = typeof conceptRevisions.$inferSelect;
export type NewConceptRevision = typeof conceptRevisions.$inferInsert;
