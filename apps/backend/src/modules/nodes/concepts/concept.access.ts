import type { AppUser } from "../../../database/schema/appUsers.ts";
import type { BaseNodeRevision } from "../../../database/schema/baseNodeRevisions.ts";
import type { Notebook } from "../../../database/schema/notebooks.ts";
import { InvariantError, NotFoundError } from "../../../shared/errors/appError.ts";
import type { ServiceContext } from "../../../shared/services/serviceContext.ts";
import { requireNode, requireNodeForUpdate } from "../baseNode.access.ts";
import { createConceptRepository } from "./concept.repository.ts";

export async function requireConcept(
	context: ServiceContext,
	appUserId: AppUser["id"],
	notebookId: Notebook["id"],
	nodeId: BaseNodeRevision["id"],
) {
	const baseNode = await requireNode(context, appUserId, notebookId, nodeId);

	if (baseNode.type !== "concept")
		throw new NotFoundError("NODE_NOT_FOUND", "Could not find node.");

	const conceptRepo = createConceptRepository(context.database);
	const concept = await conceptRepo.findByBaseNodeId({ baseNodeId: baseNode.id });

	if (!concept)
		throw new InvariantError(
			"Base node with concept type exists without corresponding concept object.",
		);

	return { baseNode, extension: concept };
}

export async function requireConceptForUpdate(
	context: ServiceContext,
	appUserId: AppUser["id"],
	notebookId: Notebook["id"],
	nodeId: BaseNodeRevision["id"],
) {
	const baseNode = await requireNodeForUpdate(context, appUserId, notebookId, nodeId);

	if (baseNode.type !== "concept")
		throw new NotFoundError("NODE_NOT_FOUND", "Could not find node.");

	const conceptRepo = createConceptRepository(context.database);
	const concept = await conceptRepo.findByBaseNodeIdForUpdate({ baseNodeId: baseNode.id });

	if (!concept)
		throw new InvariantError(
			"Base node with concept type exists without corresponding concept object.",
		);

	return { baseNode, extension: concept };
}
