import type { FastifyPluginCallback } from "fastify";
import { getAuthenticatedUser } from "../auth/authenticatedUser.ts";

const userRoutes: FastifyPluginCallback = (app, _options, done) => {
	app.get("/me", { preHandler: app.requireAuthentication }, (request, _reply) => {
		return getAuthenticatedUser(request);
	});

	done();
};

export default userRoutes;
