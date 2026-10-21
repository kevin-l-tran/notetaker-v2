import { eq } from "drizzle-orm";
import type { BaseNodeRevision } from "../../../database/schema/baseNodeRevisions.ts";
import {
	conceptRevisions,
	type NewConceptRevision,
} from "../../../database/schema/conceptRevisions.ts";
import type { DatabaseExecutor } from "../../../database/types.ts";

export function createConceptRevisionRepository(database: DatabaseExecutor) {
	return {
		async findByRevisionId(input: { baseNodeRevisionId: BaseNodeRevision["id"] }) {
			const res = await database
				.select()
				.from(conceptRevisions)
				.where(eq(conceptRevisions.baseNodeRevisionId, input.baseNodeRevisionId))
				.limit(1);

			return res[0];
		},

		async create(input: {
			baseNodeRevisionId: BaseNodeRevision["id"];
			descriptionSource: NewConceptRevision["descriptionSource"];
		}) {
			const res = await database.insert(conceptRevisions).values(input).returning();

			const newConceptRevision = res[0];
			if (!newConceptRevision) throw new Error("Concept revision creation failed.");

			return newConceptRevision;
		},
	};
}
