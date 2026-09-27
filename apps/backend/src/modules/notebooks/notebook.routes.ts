import { CreateNotebookRequestSchema, NotebookSummarySchema } from "@notetaker-v2/contracts";
import type { FastifyPluginCallback } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import z from "zod";
import { db } from "../../database/client.ts";
import { createServiceContext } from "../../shared/services/serviceContext.ts";
import { getAuthenticatedUser } from "../auth/authenticatedUser.ts";
import { toNotebookSummaryDTO } from "./notebook.mapper.ts";
import { createNotebookService } from "./notebook.service.ts";

const notebookRoutes: FastifyPluginCallback = (app, _options, done) => {
	const zodApp = app.withTypeProvider<ZodTypeProvider>();

	const notebookService = createNotebookService(createServiceContext(db));

	zodApp.get(
		"/notebooks",
		{
			preHandler: app.requireAuthentication,
			schema: { response: { 200: z.array(NotebookSummarySchema) } },
		},
		async (request, _reply) => {
			const appUser = getAuthenticatedUser(request);

			const notebooks = await notebookService.listNotebooksForUser({ appUserId: appUser.id });

			return notebooks.map((v) => toNotebookSummaryDTO({ notebook: v, myRole: v.myRole }));
		},
	);

	zodApp.post(
		"/notebooks",
		{
			preHandler: app.requireAuthentication,
			schema: { body: CreateNotebookRequestSchema, response: { 201: NotebookSummarySchema } },
		},
		async (request, reply) => {
			const appUser = getAuthenticatedUser(request);

			const newNotebook = await notebookService.createNotebook({
				appUserId: appUser.id,
				data: request.body,
			});

			reply.code(201);
			return toNotebookSummaryDTO({ notebook: newNotebook, myRole: newNotebook.myRole });
		},
	);

	done();
};

export default notebookRoutes;
