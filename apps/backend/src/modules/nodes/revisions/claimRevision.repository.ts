import { eq } from "drizzle-orm";
import type { BaseNodeRevision } from "../../../database/schema/baseNodeRevisions.ts";
import { claimRevisions, type NewClaimRevision } from "../../../database/schema/claimRevisions.ts";
import type { DatabaseExecutor } from "../../../database/types.ts";

export function createClaimRevisionRepository(database: DatabaseExecutor) {
	return {
		async findByRevisionId(input: { baseNodeRevisionId: BaseNodeRevision["id"] }) {
			const res = await database
				.select()
				.from(claimRevisions)
				.where(eq(claimRevisions.baseNodeRevisionId, input.baseNodeRevisionId))
				.limit(1);

			return res[0];
		},

		async create(input: {
			baseNodeRevisionId: BaseNodeRevision["id"];
			predicateSource: NewClaimRevision["predicateSource"];
			resultSource: NewClaimRevision["resultSource"];
			justificationSource: NewClaimRevision["justificationSource"];
		}) {
			const res = await database.insert(claimRevisions).values(input).returning();

			const newClaimRevision = res[0];
			if (!newClaimRevision) throw new Error("Claim revision creation failed.");

			return newClaimRevision;
		},
	};
}
