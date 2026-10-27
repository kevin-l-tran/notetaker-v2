import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import {
	CreateNodeRequestSchema,
	GetNodeResponseSchema,
	GetNodesResponseSchema,
	NodeDraftSchema,
	NodeIdSchema,
	NodeSchema,
	NotebookIdSchema,
} from "@notetaker-v2/contracts";
import type { FastifyPluginCallback } from "fastify";
import z from "zod";
import { db } from "../../database/client.ts";
import { createServiceContext } from "../../shared/services/serviceContext.ts";
import { getAuthenticatedUser } from "../auth/authenticatedUser.ts";
import { createNodeService } from "./node.service.ts";
import {
	toCreateNodeResponseDTO,
	toGetNodeResponseDTO,
	toGetNodesResponseDTO,
} from "./nodes.mapper.ts";

const nodeRoutes: FastifyPluginCallback = (app, _options, done) => {
	const zodApp = app.withTypeProvider<ZodTypeProvider>();

	const nodeService = createNodeService(createServiceContext(db));

	zodApp.get(
		"/notebooks/:notebookId/nodes",
		{
			preHandler: app.requireAuthentication,
			schema: {
				response: { 200: GetNodesResponseSchema },
				params: z.object({ notebookId: NotebookIdSchema }),
			},
		},
		async (request, _reply) => {
			const { notebookId } = request.params;

			const appUser = getAuthenticatedUser(request);

			const data = await nodeService.listNodesForNotebook({
				appUserId: appUser.id,
				notebookId,
			});

			return toGetNodesResponseDTO(data);
		},
	);

	zodApp.get(
		"/notebooks/:notebookId/nodes/:nodeId",
		{
			preHandler: app.requireAuthentication,
			schema: {
				response: { 200: GetNodeResponseSchema },
				params: z.object({ notebookId: NotebookIdSchema, nodeId: NodeIdSchema }),
			},
		},
		async (request, _reply) => {
			const { notebookId, nodeId } = request.params;

			const appUser = getAuthenticatedUser(request);

			const nodeContent = await nodeService.getNode({ appUserId: appUser.id, notebookId, nodeId });

			return toGetNodeResponseDTO({ nodeContent });
		},
	);

	zodApp.post(
		"/notebooks/:notebookId/nodes",
		{
			preHandler: app.requireAuthentication,
			schema: {
				response: { 201: z.object({ node: NodeSchema, draft: NodeDraftSchema }) },
				params: z.object({ notebookId: NotebookIdSchema }),
				body: CreateNodeRequestSchema,
			},
		},
		async (request, reply) => {
			const { notebookId } = request.params;

			const appUser = getAuthenticatedUser(request);

			const { nodeContent, draft: draftContent } = await nodeService.createNode({
				appUserId: appUser.id,
				notebookId,
				data: { type: request.body.type },
			});

			reply.code(201);
			return toCreateNodeResponseDTO({ nodeContent, draftContent });
		},
	);

	zodApp.delete(
		"/notebooks/:notebookId/nodes/:nodeId",
		{
			preHandler: app.requireAuthentication,
			schema: {
				params: z.object({ notebookId: NotebookIdSchema, nodeId: NodeIdSchema }),
			},
		},
		async (request, reply) => {
			const { notebookId, nodeId } = request.params;

			const appUser = getAuthenticatedUser(request);

			await nodeService.deleteNode({ appUserId: appUser.id, notebookId, nodeId });

			return reply.code(204).send();
		},
	);

	done();
};

export default nodeRoutes;
