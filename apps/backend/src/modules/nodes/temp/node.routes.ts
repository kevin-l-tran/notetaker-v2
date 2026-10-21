import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import {
	CreateNodeRequestSchema,
	NodeIdSchema,
	NodeSchema,
	NotebookIdSchema,
	UpdateNodeRequestSchema,
} from "@notetaker-v2/contracts";
import type { FastifyPluginCallback } from "fastify";
import z from "zod";
import { db } from "../../database/client.ts";
import { createServiceContext } from "../../shared/services/serviceContext.ts";
import { getAuthenticatedUser } from "../auth/authenticatedUser.ts";
import { toNodeDTO } from "./node.mapper.ts";
import { createNodeService } from "./node.service.ts";

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

			return nodesData.map((nd) => toNodeDTO({ nodeData: nd }));
		},
	);

	zodApp.get(
		"/notebooks/:notebookId/nodes/:id",
		{
			preHandler: app.requireAuthentication,
			schema: {
				response: { 200: NodeSchema },
				params: z.object({ notebookId: NotebookIdSchema, id: NodeIdSchema }),
			},
		},
		async (request, _reply) => {
			const { notebookId, id } = request.params;

			const appUser = getAuthenticatedUser(request);

			const nodeData = await nodeService.getNode({
				appUserId: appUser.id,
				notebookId,
				baseNodeId: id,
			});

			return toNodeDTO({ nodeData });
		},
	);

	zodApp.post(
		"/notebooks/:notebookId/nodes",
		{
			preHandler: app.requireAuthentication,
			schema: {
				body: CreateNodeRequestSchema,
				response: { 201: NodeSchema },
				params: z.object({ notebookId: NotebookIdSchema }),
			},
		},
		async (request, reply) => {
			const { notebookId } = request.params;

			const appUser = getAuthenticatedUser(request);

			const nodeData = await nodeService.createNode({
				appUserId: appUser.id,
				notebookId,
				data: request.body,
			});

			reply.code(201);
			return toNodeDTO({ nodeData });
		},
	);

	zodApp.patch(
		"/notebooks/:notebookId/nodes/:id",
		{
			preHandler: app.requireAuthentication,
			schema: {
				body: UpdateNodeRequestSchema,
				response: { 200: NodeSchema },
				params: z.object({ notebookId: NotebookIdSchema, id: NodeIdSchema }),
			},
		},
		async (request, _reply) => {
			const { notebookId, id } = request.params;

			const appUser = getAuthenticatedUser(request);

			const nodeData = await nodeService.updateNode({
				appUserId: appUser.id,
				notebookId,
				baseNodeId: id,
				data: request.body,
			});

			return toNodeDTO({ nodeData });
		},
	);

	zodApp.delete(
		"/notebooks/:notebookId/nodes/:id",
		{
			preHandler: app.requireAuthentication,
			schema: {
				params: z.object({ notebookId: NotebookIdSchema, id: NodeIdSchema }),
			},
		},
		async (request, reply) => {
			const { notebookId, id } = request.params;

			const appUser = getAuthenticatedUser(request);

			await nodeService.deleteNode({
				appUserId: appUser.id,
				notebookId,
				baseNodeId: id,
			});

			return reply.code(204).send();
		},
	);

	done();
};

export default nodeRoutes;
