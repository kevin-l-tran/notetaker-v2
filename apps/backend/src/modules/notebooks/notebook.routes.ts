import type { FastifyPluginCallback } from "fastify";
import { db } from "../../database/client.ts";
import { createServiceContext } from "../../shared/services/serviceContext.ts";
import { getAuthenticatedUser } from "../auth/authenticatedUser.ts";
import { toNotebookSummaryDTO } from "./notebook.mapper.ts";
import { createNotebookService } from "./notebook.service.ts";

const notebookRoutes: FastifyPluginCallback = (app, _options, done) => {
	const notebookService = createNotebookService(createServiceContext(db));

	app.get("/notebooks", { preHandler: app.requireAuthentication }, async (request, _reply) => {
		const appUser = getAuthenticatedUser(request);

		const notebooks = await notebookService.listNotebooksForUser({ appUserId: appUser.id });

		return notebooks.map((v) => toNotebookSummaryDTO({ notebook: v, role: v.myRole }));
	});

	done();
};

export default notebookRoutes;
