import { and, desc, eq } from "drizzle-orm";
import {
	type BaseNodeRevision,
	baseNodeRevisions,
} from "../../../database/schema/baseNodeRevisions.ts";
import { type ClaimRevision, claimRevisions } from "../../../database/schema/claimRevisions.ts";
import {
	type ConceptRevision,
	conceptRevisions,
} from "../../../database/schema/conceptRevisions.ts";
import type { Node } from "../../../database/schema/node.ts";
import type { DatabaseExecutor } from "../../../database/types.ts";
import { InvariantError } from "../../../shared/errors/appError.ts";

export function createNodeRevisionRepository(database: DatabaseExecutor) {
	return {
		async findByNodeIdAndRevisionNumber(input: {
			nodeId: Node["id"];
			nodeType: Node["type"];
			revisionNumber: BaseNodeRevision["revisionNumber"];
		}) {
			const row = await database
				.select({
					baseRevision: baseNodeRevisions,
					conceptRevision: conceptRevisions,
					claimRevision: claimRevisions,
				})
				.from(baseNodeRevisions)
				.leftJoin(conceptRevisions, eq(conceptRevisions.baseNodeRevisionId, baseNodeRevisions.id))
				.leftJoin(claimRevisions, eq(claimRevisions.baseNodeRevisionId, baseNodeRevisions.id))
				.where(
					and(
						eq(baseNodeRevisions.nodeId, input.nodeId),
						eq(baseNodeRevisions.revisionNumber, input.revisionNumber),
					),
				)
				.limit(1);

			if (!row[0]) return;

			return mapNodeRevision(row[0], input.nodeType);
		},

		async findLatestForNode(input: { nodeId: Node["id"]; nodeType: Node["type"] }) {
			const row = await database
				.select({
					baseRevision: baseNodeRevisions,
					conceptRevision: conceptRevisions,
					claimRevision: claimRevisions,
				})
				.from(baseNodeRevisions)
				.orderBy(desc(baseNodeRevisions.revisionNumber))
				.leftJoin(conceptRevisions, eq(conceptRevisions.baseNodeRevisionId, baseNodeRevisions.id))
				.leftJoin(claimRevisions, eq(claimRevisions.baseNodeRevisionId, baseNodeRevisions.id))
				.where(and(eq(baseNodeRevisions.nodeId, input.nodeId)))
				.limit(1);

			if (!row[0]) return;

			return mapNodeRevision(row[0], input.nodeType);
		},
	};
}

function mapNodeRevision(
	row: {
		baseRevision: BaseNodeRevision;
		conceptRevision: ConceptRevision | null;
		claimRevision: ClaimRevision | null;
	},
	nodeType: Node["type"],
) {
	const { baseRevision, conceptRevision, claimRevision } = row;

	const base = {
		title: baseRevision.title,
		aliases: baseRevision.aliases,
		excludedAliases: baseRevision.excludedAliases,
	};

	switch (nodeType) {
		case "concept": {
			if (!conceptRevision) {
				throw new InvariantError("Missing concept revision extension.");
			}

			return {
				baseRevision,
				content: {
					...base,
					type: "concept" as const,
					descriptionSource: conceptRevision.descriptionSource,
				},
			};
		}

		case "claim": {
			if (!claimRevision) {
				throw new InvariantError("Missing claim revision extension.");
			}

			return {
				baseRevision,
				content: {
					...base,
					type: "claim" as const,
					predicateSource: claimRevision.predicateSource,
					resultSource: claimRevision.resultSource,
					justificationSource: claimRevision.justificationSource,
				},
			};
		}
	}
}
