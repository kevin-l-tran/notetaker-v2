import { and, eq, sql } from "drizzle-orm";
import { type Node, nodes } from "../../../database/schema/node.ts";
import {
	type NewNodeDraft,
	type NodeDraft,
	nodeDrafts,
} from "../../../database/schema/nodeDraft.ts";
import type { Notebook } from "../../../database/schema/notebooks.ts";
import type { DatabaseExecutor } from "../../../database/types.ts";

export function createNodeDraftRepository(database: DatabaseExecutor) {
	return {
		async findByNodeId(input: { nodeId: Node["id"] }) {
			const res = await database
				.select()
				.from(nodeDrafts)
				.where(eq(nodeDrafts.nodeId, input.nodeId))
				.limit(1);

			return res[0];
		},

		async findByNodeIdForUpdate(input: { nodeId: Node["id"] }) {
			const res = await database
				.select()
				.from(nodeDrafts)
				.for("update")
				.where(eq(nodeDrafts.nodeId, input.nodeId))
				.limit(1);

			return res[0];
		},

		async findForNotebook(input: { notebookId: Notebook["id"] }) {
			const rows = await database
				.select({ draft: nodeDrafts })
				.from(nodeDrafts)
				.innerJoin(nodes, eq(nodeDrafts.nodeId, nodes.id))
				.where(eq(nodes.notebookId, input.notebookId));

			return rows.map((row) => row.draft);
		},

		async create(input: { nodeId: Node["id"]; yjsState: NewNodeDraft["yjsState"] }) {
			const res = await database.insert(nodeDrafts).values(input).returning();

			const newNodeDraft = res[0];
			if (!newNodeDraft) throw new Error("Node draft creation failed.");

			return newNodeDraft;
		},

		async saveIfVersionMatches(input: {
			id: NodeDraft["id"];
			saveVersion: NodeDraft["saveVersion"];
			yjsState: NewNodeDraft["yjsState"];
		}) {
			const res = await database
				.update(nodeDrafts)
				.set({
					yjsState: input.yjsState,
					saveVersion: sql`${nodeDrafts.saveVersion} + 1`,
				})
				.where(and(eq(nodeDrafts.id, input.id), eq(nodeDrafts.saveVersion, input.saveVersion)))
				.returning();

			return res[0];
		},

		async delete(input: { id: NodeDraft["id"] }) {
			const res = await database.delete(nodeDrafts).where(eq(nodeDrafts.id, input.id)).returning();

			return res[0];
		},
	};
}
