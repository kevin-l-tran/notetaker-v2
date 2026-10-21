import { eq, inArray } from "drizzle-orm";
import type { BaseNodeRevision } from "../../../database/schema/baseNodeRevisions.ts";
import { conceptRevisions } from "../../../database/schema/conceptRevisions.ts";
import type { DatabaseExecutor } from "../../../database/types.ts";

export function createConceptRepository(database: DatabaseExecutor) {
	return {
		async findByBaseNodeId(input: { baseNodeId: BaseNodeRevision["id"] }) {
			const res = await database
				.select()
				.from(conceptRevisions)
				.where(eq(conceptRevisions.baseNodeId, input.baseNodeId))
				.limit(1);

			return res[0];
		},

		async findByBaseNodeIds(input: { baseNodeIds: BaseNodeRevision["id"][] }) {
			if (input.baseNodeIds.length === 0) return [];

			return await database
				.select()
				.from(conceptRevisions)
				.where(inArray(conceptRevisions.baseNodeId, input.baseNodeIds));
		},

		async findByBaseNodeIdForUpdate(input: { baseNodeId: BaseNodeRevision["id"] }) {
			const res = await database
				.select()
				.from(conceptRevisions)
				.for("update")
				.where(eq(conceptRevisions.baseNodeId, input.baseNodeId))
				.limit(1);

			return res[0];
		},

		async create(input: { baseNodeId: BaseNodeRevision["id"] }) {
			const res = await database.insert(conceptRevisions).values(input).returning();

			const newConceptRevision = res[0];
			if (!newConceptRevision) throw new Error("Concept revision creation failed.");

			return newConceptRevision;
		},
	};
}
