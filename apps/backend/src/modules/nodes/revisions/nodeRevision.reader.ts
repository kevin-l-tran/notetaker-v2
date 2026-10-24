import type { PublishableNodeContent } from "@notetaker-v2/node_document";
import type { BaseNodeRevision } from "../../../database/schema/baseNodeRevisions.ts";
import type { Node } from "../../../database/schema/node.ts";
import { InvariantError } from "../../../shared/errors/appError.ts";
import type { ServiceContext } from "../../../shared/services/serviceContext.ts";
import { createBaseNodeRevisionRepository } from "./baseNodeRevision.repository.ts";
import { createClaimRevisionRepository } from "./claimRevision.repository.ts";
import { createConceptRevisionRepository } from "./conceptRevision.repository.ts";

export async function getLatestNodeContent(
	context: ServiceContext,
	node: Node,
): Promise<PublishableNodeContent | null> {
	const baseRevisionRepo = createBaseNodeRevisionRepository(context.database);
	const revision = await baseRevisionRepo.findLatestForNode({ nodeId: node.id });

	if (!revision) return null;
	return readNodeContent(context, node, revision);
}

export async function getNodeRevisionContent(
	context: ServiceContext,
	node: Node,
	revisionNumber: number,
): Promise<PublishableNodeContent | null> {
	const baseRevisionRepo = createBaseNodeRevisionRepository(context.database);
	const revision = await baseRevisionRepo.findByNodeIdAndRevisionNumber({
		nodeId: node.id,
		revisionNumber,
	});

	if (!revision) return null;
	return readNodeContent(context, node, revision);
}

async function readNodeContent(
	context: ServiceContext,
	node: Node,
	revision: BaseNodeRevision,
): Promise<PublishableNodeContent> {
	const base = {
		title: revision.title,
		aliases: revision.aliases,
	};

	switch (node.type) {
		case "concept": {
			const repo = createConceptRevisionRepository(context.database);
			const concept = await repo.findByRevisionId({
				baseNodeRevisionId: revision.id,
			});
			if (!concept) throw new InvariantError("Missing concept revision extension.");

			return {
				...base,
				type: "concept",
				descriptionSource: concept.descriptionSource,
			};
		}
		case "claim": {
			const repo = createClaimRevisionRepository(context.database);
			const claim = await repo.findByRevisionId({
				baseNodeRevisionId: revision.id,
			});
			if (!claim) throw new InvariantError("Missing claim revision extension.");

			return {
				...base,
				type: "claim",
				predicateSource: claim.predicateSource,
				resultSource: claim.resultSource,
				justificationSource: claim.justificationSource,
			};
		}
		default: {
			const unreachable: never = node.type;
			throw new InvariantError(`Unsupported node type: ${unreachable}`);
		}
	}
}
