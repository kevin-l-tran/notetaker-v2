import { and, eq } from "drizzle-orm";
import { type BaseNode, baseNodes } from "../../database/schema/baseNodes.ts";
import { concepts } from "../../database/schema/concepts.ts";
import type { Notebook } from "../../database/schema/notebooks.ts";
import type { DatabaseExecutor } from "../../database/types.ts";

export function createNodeRepository(database: DatabaseExecutor) {
	return {
		async findByBaseNodeIdAndNotebookIdWithExtension(input: {
			baseNodeId: BaseNode["id"];
			notebookId: Notebook["id"];
		}) {
			const res = await database
				.select()
				.from(baseNodes)
				.leftJoin(concepts, eq(baseNodes.id, concepts.baseNodeId))
				.where(and(eq(baseNodes.id, input.baseNodeId), eq(baseNodes.notebookId, input.notebookId)))
				.limit(1);

			return res[0];
		},

		async findForNotebookWithExtension(input: { notebookId: Notebook["id"] }) {
			return await database
				.select()
				.from(baseNodes)
				.leftJoin(concepts, eq(baseNodes.id, concepts.baseNodeId))
				.where(eq(baseNodes.notebookId, input.notebookId));
		},
	};
}
