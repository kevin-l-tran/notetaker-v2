import type { ZodTypeProvider } from "@fastify/type-provider-zod";
import { UserSchema } from "@notetaker-v2/contracts";
import type { FastifyPluginCallback } from "fastify";
import { getAuthenticatedUser } from "../auth/authenticatedUser.ts";
import { toUserDTO } from "./user.mapper.ts";

const userRoutes: FastifyPluginCallback = (app, _options, done) => {
	const zodApp = app.withTypeProvider<ZodTypeProvider>();

	zodApp.get(
		"/me",
		{ preHandler: app.requireAuthentication, schema: { response: { 200: UserSchema } } },
		(request, _reply) => {
			const appUser = getAuthenticatedUser(request);
			return toUserDTO({ appUser });
		},
	);

	done();
};

export default userRoutes;
