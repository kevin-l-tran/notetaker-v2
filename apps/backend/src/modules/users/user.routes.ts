import type { FastifyPluginCallback } from "fastify";
import { getAuthenticatedUser } from "../auth/authenticatedUser.ts";
import { toUserDTO } from "./user.mapper.ts";

const userRoutes: FastifyPluginCallback = (app, _options, done) => {
	app.get("/me", { preHandler: app.requireAuthentication }, (request, _reply) => {
		const appUser = getAuthenticatedUser(request);
		return toUserDTO({ appUser });
	});

	done();
};

export default userRoutes;
