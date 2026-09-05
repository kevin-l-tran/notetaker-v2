import { fromNodeHeaders } from "better-auth/node";
import type { FastifyPluginCallback } from "fastify";
import { db } from "../../database/client.ts";
import { toUserDTO } from "../users/user.mapper.ts";
import { createUserService } from "../users/user.service.ts";
import auth from "./auth.ts";

const meRoutes: FastifyPluginCallback = (app, _options, done) => {
	const userService = createUserService(db);

	app.get("/me", async (request, reply) => {
		const session = await auth.api.getSession({
			headers: fromNodeHeaders(request.headers),
		});

		if (!session) {
			return reply.status(401).send({ error: "Unauthorized" });
		}

		const user = await userService.getAuthenticatedUser({
			provider: "better-auth",
			subject: session.user.id,
		});

		return reply.send(
			toUserDTO({
				appUser: user,
				email: session.user.email,
			}),
		);
	});

	done();
};

export default meRoutes;
