import { snakeCase, text, uuid } from "drizzle-orm/pg-core";
import { baseNodes } from "./baseNodes.ts";

export const concepts = snakeCase.table("concepts", {
	id: uuid().defaultRandom().primaryKey(),
	baseNodeId: uuid()
		.references(() => baseNodes.id, { onDelete: "cascade" })
		.notNull(),
	descriptionSource: text().notNull(),
});
