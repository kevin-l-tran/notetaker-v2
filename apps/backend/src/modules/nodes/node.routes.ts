import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import {
	CreateNodeRequestSchema,
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
import { toNodeDraftDTO, toNodeDTO } from "./nodes.mapper.ts";

const nodeRoutes: FastifyPluginCallback = (app, _options, done) => {
	const zodApp = app.withTypeProvider<ZodTypeProvider>();

	const nodeService = createNodeService(createServiceContext(db));

	zodApp.get(
		"/notebooks/:notebookId/nodes",
		{
			preHandler: app.requireAuthentication,
			schema: {
				response: { 200: z.array(NodeSchema) },
				params: z.object({ notebookId: NotebookIdSchema }),
			},
		},
		async (request, _reply) => {
			const { notebookId } = request.params;

			const appUser = getAuthenticatedUser(request);

			const nodesData = await nodeService.listNodesForNotebook({
				appUserId: appUser.id,
				notebookId,
			});

			return nodesData.map((n) => toNodeDTO({ nodeContent: n }));
		},
	);

	zodApp.get(
		"/notebooks/:notebookId/nodes/:nodeId",
		{
			preHandler: app.requireAuthentication,
			schema: {
				response: { 200: NodeSchema },
				params: z.object({ notebookId: NotebookIdSchema, nodeId: NodeIdSchema }),
			},
		},
		async (request, _reply) => {
			const { notebookId, nodeId } = request.params;

			const appUser = getAuthenticatedUser(request);

			const nodeData = await nodeService.getNode({ appUserId: appUser.id, notebookId, nodeId });

			return toNodeDTO({ nodeContent: nodeData });
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

			const nodeData = await nodeService.createNode({
				appUserId: appUser.id,
				notebookId,
				data: { type: request.body.type },
			});

			const node = toNodeDTO({
				nodeContent: { ...nodeData, hasDraft: nodeData.draft !== undefined },
			});
			const draft = toNodeDraftDTO({ nodeDraft: nodeData.draft });

			reply.code(201);
			return { node, draft };
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
