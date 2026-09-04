import { fromNodeHeaders } from "better-auth/node";
import type { FastifyPluginCallback } from "fastify";
import auth from "./auth.client.ts";

const meRoutes: FastifyPluginCallback = (app, _options, done) => {
	app.get("/api/me", async (request, reply) => {
		const session = await auth.api.getSession({
			headers: fromNodeHeaders(request.headers),
		});

		if (!session) {
			return reply.status(401).send({ error: "Unauthorized" });
		}

		return reply.send(session);
	});

	done();
};

export default meRoutes;
