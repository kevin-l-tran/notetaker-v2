import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import {
	CreateNodeDraftResponseSchema,
	GetNodeDraftResponseSchema,
	NodeDraftIdSchema,
	NodeIdSchema,
	NotebookIdSchema,
	PublishDraftRequestSchema,
	PublishNodeDraftResponseSchema,
	SaveDraftRequestSchema,
	SaveNodeDraftResponseSchema,
} from "@notetaker-v2/contracts";
import type { FastifyPluginCallback } from "fastify";
import z from "zod";
import { db } from "../../../database/client.ts";
import { createServiceContext } from "../../../shared/services/serviceContext.ts";
import { getAuthenticatedUser } from "../../auth/authenticatedUser.ts";
import { toNodeRevisionDTO } from "../revisions/nodeRevision.mapper.ts";
import { toNodeDraftDTO } from "./nodeDraft.mapper.ts";
import { createNodeDraftService } from "./nodeDraft.service.ts";

const nodeDraftRoutes: FastifyPluginCallback = (app, _options, done) => {
	const zodApp = app.withTypeProvider<ZodTypeProvider>();

	const nodeDraftService = createNodeDraftService(createServiceContext(db));

	zodApp.get(
		"/notebooks/:notebookId/nodes/:nodeId/draft",
		{
			preHandler: app.requireAuthentication,
			schema: {
				response: { 200: GetNodeDraftResponseSchema },
				params: z.object({ notebookId: NotebookIdSchema, nodeId: NodeIdSchema }),
			},
		},
		async (request, _reply) => {
			const { notebookId, nodeId } = request.params;

			const appUser = getAuthenticatedUser(request);

			const nodeDraft = await nodeDraftService.getDraft({
				appUserId: appUser.id,
				notebookId,
				nodeId,
			});

			return toNodeDraftDTO({ nodeDraft });
		},
	);

	zodApp.post(
		"/notebooks/:notebookId/nodes/:nodeId/draft",
		{
			preHandler: app.requireAuthentication,
			schema: {
				response: { 200: CreateNodeDraftResponseSchema, 201: CreateNodeDraftResponseSchema },
				params: z.object({ notebookId: NotebookIdSchema, nodeId: NodeIdSchema }),
			},
		},
		async (request, reply) => {
			const { notebookId, nodeId } = request.params;

			const appUser = getAuthenticatedUser(request);

			const { nodeDraft, existing } = await nodeDraftService.createDraft({
				appUserId: appUser.id,
				notebookId,
				nodeId,
			});

			if (existing) reply.code(200);
			else reply.code(201);

			return toNodeDraftDTO({ nodeDraft });
		},
	);

	zodApp.post(
		"/notebooks/:notebookId/nodes/:nodeId/draft/:draftId/publish",
		{
			preHandler: app.requireAuthentication,
			schema: {
				response: {
					201: PublishNodeDraftResponseSchema,
				},
				params: z.object({
					notebookId: NotebookIdSchema,
					nodeId: NodeIdSchema,
					draftId: NodeDraftIdSchema,
				}),
				body: PublishDraftRequestSchema,
			},
		},
		async (request, reply) => {
			const { notebookId, nodeId, draftId } = request.params;

			const appUser = getAuthenticatedUser(request);

			const { revision, publicationVersion } = await nodeDraftService.publishDraft({
				appUserId: appUser.id,
				notebookId,
				nodeId,
				draftId,
				expectedSaveVersion: request.body.expectedSaveVersion,
			});

			reply.code(201);
			return { publicationVersion, revision: toNodeRevisionDTO(revision) };
		},
	);

	zodApp.put(
		"/notebooks/:notebookId/nodes/:nodeId/draft/:draftId",
		{
			preHandler: app.requireAuthentication,
			schema: {
				response: { 200: SaveNodeDraftResponseSchema },
				params: z.object({
					notebookId: NotebookIdSchema,
					nodeId: NodeIdSchema,
					draftId: NodeDraftIdSchema,
				}),
				body: SaveDraftRequestSchema,
			},
		},
		async (request, _reply) => {
			const { notebookId, nodeId, draftId } = request.params;

			const appUser = getAuthenticatedUser(request);

			const nodeDraft = await nodeDraftService.saveDraft({
				appUserId: appUser.id,
				notebookId,
				nodeId,
				draftId,
				yjsState: Buffer.from(request.body.state, "base64"),
				expectedSaveVersion: request.body.expectedSaveVersion,
			});

			return toNodeDraftDTO({ nodeDraft });
		},
	);

	zodApp.delete(
		"/notebooks/:notebookId/nodes/:nodeId/draft/:draftId",
		{
			preHandler: app.requireAuthentication,
			schema: {
				params: z.object({
					notebookId: NotebookIdSchema,
					nodeId: NodeIdSchema,
					draftId: NodeDraftIdSchema,
				}),
			},
		},
		async (request, reply) => {
			const { notebookId, nodeId, draftId } = request.params;

			const appUser = getAuthenticatedUser(request);

			await nodeDraftService.discardDraft({
				appUserId: appUser.id,
				notebookId,
				nodeId,
				draftId,
			});

			return reply.code(204).send();
		},
	);

	done();
};

export default nodeDraftRoutes;
