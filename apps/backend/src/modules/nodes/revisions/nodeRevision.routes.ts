import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import {
	NodeDraftSchema,
	NodeIdSchema,
	NodeRevisionSchema,
	NodeRevisionSummarySchema,
	NotebookIdSchema,
} from "@notetaker-v2/contracts";
import type { FastifyPluginCallback } from "fastify";
import z from "zod";
import { db } from "../../../database/client.ts";
import { createServiceContext } from "../../../shared/services/serviceContext.ts";
import { getAuthenticatedUser } from "../../auth/authenticatedUser.ts";
import { toNodeDraftDTO } from "../drafts/nodeDraft.mapper.ts";
import { toNodeRevisionDTO, toNodeRevisionSummaryDTO } from "./nodeRevision.mapper.ts";
import { createNodeRevisionService } from "./nodeRevision.service.ts";

const nodeRevisionRoutes: FastifyPluginCallback = (app, _options, done) => {
	const zodApp = app.withTypeProvider<ZodTypeProvider>();

	const nodeRevisionService = createNodeRevisionService(createServiceContext(db));

	zodApp.get(
		"/notebooks/:notebookId/nodes/:nodeId/revisions",
		{
			preHandler: app.requireAuthentication,
			schema: {
				response: { 200: z.array(NodeRevisionSummarySchema) },
				params: z.object({ notebookId: NotebookIdSchema, nodeId: NodeIdSchema }),
			},
		},
		async (request, _reply) => {
			const { notebookId, nodeId } = request.params;

			const appUser = getAuthenticatedUser(request);

			const data = await nodeRevisionService.listRevisions({
				appUserId: appUser.id,
				notebookId,
				nodeId,
			});

			return data.map((baseRevision) => toNodeRevisionSummaryDTO({ baseRevision }));
		},
	);

	zodApp.get(
		"/notebooks/:notebookId/nodes/:nodeId/revisions/:revisionNumber",
		{
			preHandler: app.requireAuthentication,
			schema: {
				response: { 200: NodeRevisionSchema },
				params: z.object({
					notebookId: NotebookIdSchema,
					nodeId: NodeIdSchema,
					revisionNumber: z.coerce.number().int().positive(),
				}),
			},
		},
		async (request, _reply) => {
			const { notebookId, nodeId, revisionNumber } = request.params;

			const appUser = getAuthenticatedUser(request);

			const data = await nodeRevisionService.getRevision({
				appUserId: appUser.id,
				notebookId,
				nodeId,
				revisionNumber,
			});

			return toNodeRevisionDTO(data);
		},
	);

	zodApp.post(
		"/notebooks/:notebookId/nodes/:nodeId/revisions/:revisionNumber/restore",
		{
			preHandler: app.requireAuthentication,
			schema: {
				response: { 201: NodeDraftSchema },
				params: z.object({
					notebookId: NotebookIdSchema,
					nodeId: NodeIdSchema,
					revisionNumber: z.coerce.number().int().positive(),
				}),
			},
		},
		async (request, reply) => {
			const { notebookId, nodeId, revisionNumber } = request.params;

			const appUser = getAuthenticatedUser(request);

			const nodeDraft = await nodeRevisionService.restoreRevision({
				appUserId: appUser.id,
				notebookId,
				nodeId,
				revisionNumber,
			});

			reply.code(201);
			return toNodeDraftDTO({ nodeDraft });
		},
	);

	done();
};

export default nodeRevisionRoutes;
