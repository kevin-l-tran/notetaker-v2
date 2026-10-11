import { snakeCase, text, uuid } from "drizzle-orm/pg-core";
import { baseNodes } from "./baseNodes.ts";

export const concepts = snakeCase.table("concepts", {
	baseNodeId: uuid()
		.references(() => baseNodes.id, { onDelete: "cascade" })
		.primaryKey(),
	descriptionSource: text().notNull(),
});

export type Concept = typeof concepts.$inferSelect;
export type NewConcept = typeof concepts.$inferInsert;
