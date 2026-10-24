import type { AppUser } from "../../database/schema/appUsers.ts";
import type { Node } from "../../database/schema/node.ts";
import type { Notebook } from "../../database/schema/notebooks.ts";
import { NotFoundError } from "../../shared/errors/appError.ts";
import type { ServiceContext } from "../../shared/services/serviceContext.ts";
import { requireEditPermissionsForShare, requireMembership } from "../notebooks/notebook.access.ts";
import { createNodeRepository } from "./node.repository.ts";

export async function requireNode(
	context: ServiceContext,
	appUserId: AppUser["id"],
	notebookId: Notebook["id"],
	nodeId: Node["id"],
) {
	await requireMembership(context, appUserId, notebookId);

	const nodeRepo = createNodeRepository(context.database);
	const node = await nodeRepo.findByIdAndNotebookId({
		id: nodeId,
		notebookId: notebookId,
	});

	if (!node) throw new NotFoundError("NODE_NOT_FOUND", "Could not find node.");

	return node;
}

export async function requireNodeForEdit(
	context: ServiceContext,
	appUserId: AppUser["id"],
	notebookId: Notebook["id"],
	nodeId: Node["id"],
) {
	await requireEditPermissionsForShare(context, appUserId, notebookId);

	const nodeRepo = createNodeRepository(context.database);

	const node = await nodeRepo.findByIdAndNotebookId({
		id: nodeId,
		notebookId,
	});

	if (!node) {
		throw new NotFoundError("NODE_NOT_FOUND", "Could not find node.");
	}

	return node;
}

export async function requireNodeForShare(
	context: ServiceContext,
	appUserId: AppUser["id"],
	notebookId: Notebook["id"],
	nodeId: Node["id"],
) {
	await requireEditPermissionsForShare(context, appUserId, notebookId);

	const nodeRepo = createNodeRepository(context.database);
	const node = await nodeRepo.findByIdAndNotebookIdForShare({
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
	nodeId: Node["id"],
) {
	await requireEditPermissionsForShare(context, appUserId, notebookId);

	const nodeRepo = createNodeRepository(context.database);
	const node = await nodeRepo.findByIdAndNotebookIdForUpdate({
		id: nodeId,
		notebookId: notebookId,
	});

	if (!node) throw new NotFoundError("NODE_NOT_FOUND", "Could not find node.");

	return node;
}
