import { eq, inArray } from "drizzle-orm";
import type { BaseNode } from "../../../database/schema/baseNodes.ts";
import { type Concept, concepts } from "../../../database/schema/concepts.ts";
import type { DatabaseExecutor } from "../../../database/types.ts";

export function createConceptRepository(database: DatabaseExecutor) {
	return {
		async findByBaseNodeId(input: { baseNodeId: BaseNode["id"] }) {
			const res = await database
				.select()
				.from(concepts)
				.where(eq(concepts.baseNodeId, input.baseNodeId))
				.limit(1);

			return res[0];
		},

		async findByBaseNodeIds(input: { baseNodeIds: BaseNode["id"][] }) {
			if (input.baseNodeIds.length === 0) return [];

			return await database
				.select()
				.from(concepts)
				.where(inArray(concepts.baseNodeId, input.baseNodeIds));
		},

		async findByBaseNodeIdForUpdate(input: { baseNodeId: BaseNode["id"] }) {
			const res = await database
				.select()
				.from(concepts)
				.for("update")
				.where(eq(concepts.baseNodeId, input.baseNodeId))
				.limit(1);

			return res[0];
		},

		async create(input: {
			baseNodeId: BaseNode["id"];
			descriptionSource: Concept["descriptionSource"];
		}) {
			const res = await database.insert(concepts).values(input).returning();

			const newConcept = res[0];
			if (!newConcept) throw new Error("Concept creation failed.");

			return newConcept;
		},

		async update(input: {
			baseNodeId: BaseNode["id"];
			descriptionSource?: Concept["descriptionSource"] | undefined;
		}) {
			const res = await database
				.update(concepts)
				.set({ descriptionSource: input.descriptionSource })
				.where(eq(concepts.baseNodeId, input.baseNodeId))
				.returning();

			return res[0];
		},
	};
}
