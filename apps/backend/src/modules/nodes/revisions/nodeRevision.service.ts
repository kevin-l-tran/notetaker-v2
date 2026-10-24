import type { AppUser } from "../../../database/schema/appUsers.ts";
import type { BaseNodeRevision } from "../../../database/schema/baseNodeRevisions.ts";
import type { Notebook } from "../../../database/schema/notebooks.ts";
import { InvariantError, NotFoundError } from "../../../shared/errors/appError.ts";
import type { ServiceContext } from "../../../shared/services/serviceContext.ts";
import { requireNode } from "../node.access.ts";
import { createBaseNodeRevisionRepository } from "./baseNodeRevision.repository.ts";
import { getNodeRevisionContent } from "./nodeRevision.reader.ts";

export function createNodeRevisionService(context: ServiceContext) {
	const baseNodeRevisionRepo = createBaseNodeRevisionRepository(context.database);

	return {
		async listRevisions(input: {
			appUserId: AppUser["id"];
			notebookId: Notebook["id"];
			nodeId: BaseNodeRevision["nodeId"];
		}) {
			const node = await requireNode(context, input.appUserId, input.notebookId, input.nodeId);
			return baseNodeRevisionRepo.findForNode({ nodeId: node.id });
		},

		async getRevision(input: {
			appUserId: AppUser["id"];
			notebookId: Notebook["id"];
			nodeId: BaseNodeRevision["nodeId"];
			revisionNumber: BaseNodeRevision["revisionNumber"];
		}) {
			const node = await requireNode(context, input.appUserId, input.notebookId, input.nodeId);

			const baseRevision = await baseNodeRevisionRepo.findByNodeIdAndRevisionNumber({
				nodeId: node.id,
				revisionNumber: input.revisionNumber,
			});

			if (!baseRevision)
				throw new NotFoundError("NODE_REVISION_NOT_FOUND", "Could not find node revision.");

			const content = await getNodeRevisionContent(context, node, input.revisionNumber);

			if (!content)
				throw new InvariantError("Node revision disappeared while loading its content.");

			return { baseRevision, content };
		},
	};
}
