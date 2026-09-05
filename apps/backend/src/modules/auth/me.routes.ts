import type { FastifyPluginCallback } from "fastify";
import { getAuthenticatedUser } from "../../shared/auth/getAuthenticatedUser.ts";

const meRoutes: FastifyPluginCallback = (app, _options, done) => {
	app.get("/me", { preHandler: app.requireAuthentication }, (request, _reply) => {
		return getAuthenticatedUser(request);
	});

	done();
};

export default meRoutes;
