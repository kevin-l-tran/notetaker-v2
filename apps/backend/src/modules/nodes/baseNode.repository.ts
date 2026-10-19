import { and, eq } from "drizzle-orm";
import {
	type BaseNodeRevision,
	baseNodeRevisions,
	type NewBaseNodeRevision,
} from "../../database/schema/baseNodeRevisions.ts";
import type { Notebook } from "../../database/schema/notebooks.ts";
import type { DatabaseExecutor } from "../../database/types.ts";

export function createBaseNodeRepository(database: DatabaseExecutor) {
	return {
		async findById(input: { id: BaseNodeRevision["id"] }) {
			const res = await database
				.select()
				.from(baseNodeRevisions)
				.where(eq(baseNodeRevisions.id, input.id))
				.limit(1);

			return res[0];
		},

		async findByIdAndNotebook(input: { id: BaseNodeRevision["id"]; notebookId: Notebook["id"] }) {
			const res = await database
				.select()
				.from(baseNodeRevisions)
				.where(
					and(
						eq(baseNodeRevisions.id, input.id),
						eq(baseNodeRevisions.notebookId, input.notebookId),
					),
				)
				.limit(1);

			return res[0];
		},

		async findByIdAndNotebookForUpdate(input: {
			id: BaseNodeRevision["id"];
			notebookId: Notebook["id"];
		}) {
			const res = await database
				.select()
				.from(baseNodeRevisions)
				.for("update")
				.where(
					and(
						eq(baseNodeRevisions.id, input.id),
						eq(baseNodeRevisions.notebookId, input.notebookId),
					),
				)
				.limit(1);

			return res[0];
		},

		async findByIdForUpdate(input: { id: BaseNodeRevision["id"] }) {
			const res = await database
				.select()
				.from(baseNodeRevisions)
				.for("update")
				.where(eq(baseNodeRevisions.id, input.id))
				.limit(1);

			return res[0];
		},

		async findForNotebook(input: { notebookId: Notebook["id"] }) {
			return await database
				.select()
				.from(baseNodeRevisions)
				.where(eq(baseNodeRevisions.notebookId, input.notebookId));
		},

		async create(input: { notebookId: Notebook["id"]; type: NewBaseNodeRevision["type"] }) {
			const res = await database.insert(baseNodeRevisions).values(input).returning();

			const newBaseNodeRevision = res[0];
			if (!newBaseNodeRevision) throw new Error("Base node revision creation failed.");

			return newBaseNodeRevision;
		},

		async delete(input: { id: BaseNodeRevision["id"] }) {
			const res = await database
				.delete(baseNodeRevisions)
				.where(eq(baseNodeRevisions.id, input.id))
				.returning();

			return res[0];
		},
	};
}
