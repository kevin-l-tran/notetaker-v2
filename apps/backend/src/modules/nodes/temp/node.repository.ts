import { and, eq } from "drizzle-orm";
import {
	type BaseNodeRevision,
	baseNodeRevisions,
} from "../../database/schema/baseNodeRevisions.ts";
import { conceptRevisions } from "../../database/schema/conceptRevisions.ts";
import type { Notebook } from "../../database/schema/notebooks.ts";
import type { DatabaseExecutor } from "../../database/types.ts";

export function createNodeRepository(database: DatabaseExecutor) {
	return {
		async findByBaseNodeIdAndNotebookIdWithExtension(input: {
			baseNodeId: BaseNodeRevision["id"];
			notebookId: Notebook["id"];
		}) {
			const res = await database
				.select()
				.from(baseNodeRevisions)
				.leftJoin(conceptRevisions, eq(baseNodeRevisions.id, conceptRevisions.baseNodeId))
				.where(
					and(
						eq(baseNodeRevisions.id, input.baseNodeId),
						eq(baseNodeRevisions.notebookId, input.notebookId),
					),
				)
				.limit(1);

			return res[0];
		},

		async findForNotebookWithExtension(input: { notebookId: Notebook["id"] }) {
			return await database
				.select()
				.from(baseNodeRevisions)
				.leftJoin(conceptRevisions, eq(baseNodeRevisions.id, conceptRevisions.baseNodeId))
				.where(eq(baseNodeRevisions.notebookId, input.notebookId));
		},
	};
}
