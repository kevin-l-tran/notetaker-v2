import { eq } from "drizzle-orm";
import { type BaseNode, baseNodes, type NewBaseNode } from "../../database/schema/baseNodes.ts";
import type { Notebook } from "../../database/schema/notebooks.ts";
import type { DatabaseExecutor } from "../../database/types.ts";

export function createBaseNodeRepository(database: DatabaseExecutor) {
	return {
		async findById(input: { id: BaseNode["id"] }) {
			const res = await database
				.select()
				.from(baseNodes)
				.where(eq(baseNodes.id, input.id))
				.limit(1);

			return res[0];
		},

		async findByIdForUpdate(input: { id: BaseNode["id"] }) {
			const res = await database
				.select()
				.from(baseNodes)
				.for("update")
				.where(eq(baseNodes.id, input.id))
				.limit(1);

			return res[0];
		},

		async findForNotebook(input: { notebookId: Notebook["id"] }) {
			return await database
				.select()
				.from(baseNodes)
				.where(eq(baseNodes.notebookId, input.notebookId));
		},

		async create(input: {
			notebookId: Notebook["id"];
			type: NewBaseNode["type"];
			title: NewBaseNode["title"];
			aliases: NewBaseNode["aliases"];
		}) {
			const res = await database.insert(baseNodes).values(input).returning();

			const newBaseNode = res[0];
			if (!newBaseNode) throw new Error("Base node creation failed.");

			return newBaseNode;
		},

		async update(input: {
			id: BaseNode["id"];
			title: NewBaseNode["title"];
			aliases: NewBaseNode["aliases"];
		}) {
			const res = await database
				.update(baseNodes)
				.set({ title: input.title, aliases: input.aliases })
				.where(eq(baseNodes.id, input.id))
				.returning();

			return res[0];
		},

		async touch(input: { id: BaseNode["id"] }) {
			const res = await database
				.update(baseNodes)
				.set({ updatedAt: new Date() })
				.where(eq(baseNodes.id, input.id))
				.returning();

			return res[0];
		},

		async delete(input: { id: BaseNode["id"] }) {
			const res = await database.delete(baseNodes).where(eq(baseNodes.id, input.id)).returning();

			return res[0];
		},
	};
}
