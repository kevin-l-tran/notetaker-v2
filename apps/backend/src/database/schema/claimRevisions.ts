import { snakeCase, text, uuid } from "drizzle-orm/pg-core";
import { baseNodeRevisions } from "./baseNodeRevisions.ts";

export const claimRevisions = snakeCase.table("claim_revisions", {
	baseNodeRevisionId: uuid()
		.references(() => baseNodeRevisions.id, { onDelete: "cascade" })
		.primaryKey(),
	predicateSource: text().notNull(),
	resultSource: text().notNull(),
	justificationSource: text().notNull(),
});

export type ClaimRevision = typeof claimRevisions.$inferSelect;
export type NewClaimRevision = typeof claimRevisions.$inferInsert;
