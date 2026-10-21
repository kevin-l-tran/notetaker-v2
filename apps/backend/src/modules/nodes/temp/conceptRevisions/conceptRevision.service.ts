import type { AppUser } from "../../../../database/schema/appUsers.ts";
import type { Notebook } from "../../../../database/schema/notebooks.ts";
import type { ServiceContext } from "../../../../shared/services/serviceContext.ts";
import { requireEditPermissionsForShare } from "../../../notebooks/notebook.access.ts";
import { createBaseNodeRepository } from "../baseNodeRevision.repository.ts";
import { createConceptRepository } from "./conceptRevision.repository.ts";

export function createConceptService(context: ServiceContext) {
	return {
		async createConcept(input: {
			appUserId: AppUser["id"];
			notebookId: Notebook["id"];
			data: { type: "concept" };
		}) {
			return await context.transaction(async (transactionContext) => {
				const txBaseNodeRepo = createBaseNodeRepository(transactionContext.database);
				const txConceptRepo = createConceptRepository(transactionContext.database);

				await requireEditPermissionsForShare(transactionContext, input.appUserId, input.notebookId);

				const newBaseNode = await txBaseNodeRepo.create({
					notebookId: input.notebookId,
					type: "concept",
				});

				const newConcept = await txConceptRepo.create({
					baseNodeId: newBaseNode.id,
				});

				return { baseNode: newBaseNode, extension: newConcept };
			});
		},
	};
}
