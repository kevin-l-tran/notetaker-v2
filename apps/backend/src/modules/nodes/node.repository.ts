import { and, eq } from "drizzle-orm";
import { type NewNode, type Node, nodes } from "../../database/schema/node.ts";
import type { Notebook } from "../../database/schema/notebooks.ts";
import type { DatabaseExecutor } from "../../database/types.ts";

export function createNodeRepository(database: DatabaseExecutor) {
	return {
		async findByIdAndNotebookId(input: { id: Node["id"]; notebookId: Notebook["id"] }) {
			const res = await database
				.select()
				.from(nodes)
				.where(and(eq(nodes.id, input.id), eq(nodes.notebookId, input.notebookId)))
				.limit(1);

			return res[0];
		},

		async findByIdAndNotebookIdForShare(input: { id: Node["id"]; notebookId: Notebook["id"] }) {
			const res = await database
				.select()
				.from(nodes)
				.for("share")
				.where(and(eq(nodes.id, input.id), eq(nodes.notebookId, input.notebookId)))
				.limit(1);

			return res[0];
		},

		async findByIdAndNotebookIdForUpdate(input: { id: Node["id"]; notebookId: Notebook["id"] }) {
			const res = await database
				.select()
				.from(nodes)
				.for("update")
				.where(and(eq(nodes.id, input.id), eq(nodes.notebookId, input.notebookId)))
				.limit(1);

			return res[0];
		},

		async findForNotebook(input: { notebookId: Notebook["id"] }) {
			return await database.select().from(nodes).where(eq(nodes.notebookId, input.notebookId));
		},

		async create(input: { notebookId: Notebook["id"]; type: NewNode["type"] }) {
			const res = await database.insert(nodes).values(input).returning();

			const newNode = res[0];
			if (!newNode) throw new Error("Node creation failed.");

			return newNode;
		},

		async delete(input: { id: Node["id"] }) {
			const res = await database.delete(nodes).where(eq(nodes.id, input.id)).returning();

			return res[0];
		},
	};
}
