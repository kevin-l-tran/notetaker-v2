import { and, asc, desc, eq, getColumns } from "drizzle-orm";
import {
	type BaseNodeRevision,
	baseNodeRevisions,
	type NewBaseNodeRevision,
} from "../../../database/schema/baseNodeRevisions.ts";
import { type Node, nodes } from "../../../database/schema/node.ts";
import type { Notebook } from "../../../database/schema/notebooks.ts";
import type { DatabaseExecutor } from "../../../database/types.ts";

export function createBaseNodeRevisionRepository(database: DatabaseExecutor) {
	return {
		async findById(input: { id: BaseNodeRevision["id"] }) {
			const res = await database
				.select()
				.from(baseNodeRevisions)
				.where(eq(baseNodeRevisions.id, input.id))
				.limit(1);

			return res[0];
		},

		async findByIdAndNodeId(input: { id: BaseNodeRevision["id"]; nodeId: Node["id"] }) {
			const res = await database
				.select()
				.from(baseNodeRevisions)
				.where(and(eq(baseNodeRevisions.id, input.id), eq(baseNodeRevisions.nodeId, input.nodeId)))
				.limit(1);

			return res[0];
		},

		async findForNode(input: { nodeId: Node["id"] }) {
			return await database
				.select()
				.from(baseNodeRevisions)
				.orderBy(desc(baseNodeRevisions.revisionNumber))
				.where(eq(baseNodeRevisions.nodeId, input.nodeId));
		},

		async findLatestForNode(input: { nodeId: Node["id"] }) {
			const res = await database
				.select()
				.from(baseNodeRevisions)
				.orderBy(desc(baseNodeRevisions.revisionNumber))
				.where(eq(baseNodeRevisions.nodeId, input.nodeId))
				.limit(1);

			return res[0];
		},

		async findForNotebook(input: { notebookId: Notebook["id"] }) {
			return await database
				.select({ ...getColumns(baseNodeRevisions) })
				.from(baseNodeRevisions)
				.orderBy(desc(baseNodeRevisions.revisionNumber))
				.innerJoin(nodes, eq(baseNodeRevisions.nodeId, nodes.id))
				.where(eq(nodes.notebookId, input.notebookId));
		},

		async findLatestForNotebook(input: { notebookId: Notebook["id"] }) {
			return await database
				.selectDistinctOn([baseNodeRevisions.nodeId], { ...getColumns(baseNodeRevisions) })
				.from(baseNodeRevisions)
				.orderBy(asc(baseNodeRevisions.nodeId), desc(baseNodeRevisions.revisionNumber))
				.innerJoin(nodes, eq(baseNodeRevisions.nodeId, nodes.id))
				.where(eq(nodes.notebookId, input.notebookId));
		},

		async create(input: {
			nodeId: Node["id"];
			revisionNumber: NewBaseNodeRevision["revisionNumber"];
			title: NewBaseNodeRevision["title"];
			aliases: NewBaseNodeRevision["aliases"];
		}) {
			const res = await database.insert(baseNodeRevisions).values(input).returning();

			const newBaseNodeRevision = res[0];
			if (!newBaseNodeRevision) throw new Error("Base node revision creation failed.");

			return newBaseNodeRevision;
		},
	};
}
