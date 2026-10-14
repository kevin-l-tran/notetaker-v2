import type { AppUser } from "../../../database/schema/appUsers.ts";
import type { BaseNode } from "../../../database/schema/baseNodes.ts";
import type { Notebook } from "../../../database/schema/notebooks.ts";
import { NotFoundError } from "../../../shared/errors/appError.ts";
import type { ServiceContext } from "../../../shared/services/serviceContext.ts";
import { requireEditPermissionsForShare } from "../../notebooks/notebook.access.ts";
import { createBaseNodeRepository } from "../baseNode.repository.ts";
import type { CreateConceptData, UpdateConceptData } from "../node.types.ts";
import { requireConceptForUpdate } from "./concept.access.ts";
import { createConceptRepository } from "./concept.repository.ts";

export function createConceptService(context: ServiceContext) {
	return {
		async createConcept(input: {
			appUserId: AppUser["id"];
			notebookId: Notebook["id"];
			data: CreateConceptData;
		}) {
			return await context.transaction(async (transactionContext) => {
				const txBaseNodeRepo = createBaseNodeRepository(transactionContext.database);
				const txConceptRepo = createConceptRepository(transactionContext.database);

				await requireEditPermissionsForShare(transactionContext, input.appUserId, input.notebookId);

				const newBaseNode = await txBaseNodeRepo.create({
					notebookId: input.notebookId,
					type: "concept",
					title: input.data.title,
					aliases: input.data.aliases,
				});

				const newConcept = await txConceptRepo.create({
					baseNodeId: newBaseNode.id,
					descriptionSource: input.data.descriptionSource,
				});

				return { baseNode: newBaseNode, extension: newConcept };
			});
		},

		async updateConcept(input: {
			appUserId: AppUser["id"];
			notebookId: Notebook["id"];
			baseNodeId: BaseNode["id"];
			data: UpdateConceptData;
		}) {
			return await context.transaction(async (transactionContext) => {
				const txBaseNodeRepo = createBaseNodeRepository(transactionContext.database);
				const txConceptRepo = createConceptRepository(transactionContext.database);

				const { baseNode, extension } = await requireConceptForUpdate(
					transactionContext,
					input.appUserId,
					input.notebookId,
					input.baseNodeId,
				);

				const isUpdatingBaseNode =
					input.data.title !== undefined || input.data.aliases !== undefined;

				const updatedBaseNode = isUpdatingBaseNode
					? await txBaseNodeRepo.update({
							...input.data,
							id: baseNode.id,
						})
					: await txBaseNodeRepo.touch({ id: baseNode.id });

				if (!updatedBaseNode)
					throw new NotFoundError("NODE_NOT_FOUND", "Node to update was not found");

				const isUpdatingExtension = input.data.descriptionSource !== undefined;

				const updatedExtension = isUpdatingExtension
					? await txConceptRepo.update({
							...input.data,
							baseNodeId: updatedBaseNode.id,
						})
					: extension;

				if (!updatedExtension)
					throw new NotFoundError("NODE_NOT_FOUND", "Node to update was not found");

				return { baseNode: updatedBaseNode, extension: updatedExtension };
			});
		},
	};
}
