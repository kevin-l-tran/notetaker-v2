import { eq, inArray } from "drizzle-orm";
import type { BaseNodeRevision } from "../../../database/schema/baseNodeRevisions.ts";
import { concepts } from "../../../database/schema/conceptRevisions.ts";
import type { DatabaseExecutor } from "../../../database/types.ts";

export function createConceptRepository(database: DatabaseExecutor) {
	return {
		async findByBaseNodeId(input: { baseNodeId: BaseNodeRevision["id"] }) {
			const res = await database
				.select()
				.from(concepts)
				.where(eq(concepts.baseNodeId, input.baseNodeId))
				.limit(1);

			return res[0];
		},

		async findByBaseNodeIds(input: { baseNodeIds: BaseNodeRevision["id"][] }) {
			if (input.baseNodeIds.length === 0) return [];

			return await database
				.select()
				.from(concepts)
				.where(inArray(concepts.baseNodeId, input.baseNodeIds));
		},

		async findByBaseNodeIdForUpdate(input: { baseNodeId: BaseNodeRevision["id"] }) {
			const res = await database
				.select()
				.from(concepts)
				.for("update")
				.where(eq(concepts.baseNodeId, input.baseNodeId))
				.limit(1);

			return res[0];
		},

		async create(input: { baseNodeId: BaseNodeRevision["id"] }) {
			const res = await database.insert(concepts).values(input).returning();

			const newConceptRevision = res[0];
			if (!newConceptRevision) throw new Error("Concept revision creation failed.");

			return newConceptRevision;
		},
	};
}
