import type { AppUser } from "../../database/schema/appUsers.ts";
import type { BaseNodeRevision } from "../../database/schema/baseNodeRevisions.ts";
import type { Notebook } from "../../database/schema/notebooks.ts";
import { NotFoundError } from "../../shared/errors/appError.ts";
import type { ServiceContext } from "../../shared/services/serviceContext.ts";
import { requireEditPermissionsForShare, requireMembership } from "../notebooks/notebook.access.ts";
import { createBaseNodeRepository } from "./baseNodeRevision.repository.ts";

export async function requireNode(
	context: ServiceContext,
	appUserId: AppUser["id"],
	notebookId: Notebook["id"],
	nodeId: BaseNodeRevision["id"],
) {
	await requireMembership(context, appUserId, notebookId);

	const baseNodeRepo = createBaseNodeRepository(context.database);
	const node = await baseNodeRepo.findByIdAndNotebook({
		id: nodeId,
		notebookId: notebookId,
	});

	if (!node) throw new NotFoundError("NODE_NOT_FOUND", "Could not find node.");

	return node;
}

export async function requireNodeForUpdate(
	context: ServiceContext,
	appUserId: AppUser["id"],
	notebookId: Notebook["id"],
	nodeId: BaseNodeRevision["id"],
) {
	await requireEditPermissionsForShare(context, appUserId, notebookId);

	const baseNodeRepo = createBaseNodeRepository(context.database);
	const node = await baseNodeRepo.findByIdAndNotebookForUpdate({
		id: nodeId,
		notebookId: notebookId,
	});

	if (!node) throw new NotFoundError("NODE_NOT_FOUND", "Could not find node.");

	return node;
}
