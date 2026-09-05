import type { User } from "@notetaker-v2/contracts";
import { fromNodeHeaders } from "better-auth/node";
import type { FastifyPluginCallback, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { db } from "../../database/client.ts";
import { toUserDTO } from "../users/user.mapper.ts";
import { createAuthService } from "./auth.service.ts";
import auth from "./betterAuth.ts";

declare module "fastify" {
	interface FastifyRequest {
		authenticatedUser: User | null;
	}

	interface FastifyInstance {
		requireAuthentication(request: FastifyRequest, reply: FastifyReply): Promise<void>;
	}
}

const authentication: FastifyPluginCallback = (app, _options, done) => {
	const userService = createAuthService(db);

	app.decorateRequest("authenticatedUser", null);

	app.decorate("requireAuthentication", async (request: FastifyRequest, reply: FastifyReply) => {
		const session = await auth.api.getSession({
			headers: fromNodeHeaders(request.headers),
		});

		if (!session) {
			await reply.status(401).send({
				error: "Unauthorized",
			});
			return;
		}

		const appUser = await userService.getAuthenticatedUser({
			provider: "better-auth",
			subject: session.user.id,
		});

		request.authenticatedUser = toUserDTO({ appUser });
	});

	done();
};

export default fp(authentication, { name: "authentication" });
