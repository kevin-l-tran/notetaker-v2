import { fromNodeHeaders } from "better-auth/node";
import type { FastifyPluginCallback, FastifyReply, FastifyRequest } from "fastify";
import fp from "fastify-plugin";
import { db } from "../../database/client.ts";
import type { AppUser } from "../../database/schema/appUsers.ts";
import { createServiceContext } from "../../shared/services/serviceContext.ts";
import { createAuthService } from "./auth.service.ts";
import auth from "./betterAuth.ts";

declare module "fastify" {
	interface FastifyRequest {
		authenticatedUser: AppUser | null;
	}

	interface FastifyInstance {
		requireAuthentication(request: FastifyRequest, reply: FastifyReply): Promise<void>;
	}
}

const authentication: FastifyPluginCallback = (app, _options, done) => {
	const serviceContext = createServiceContext(db);
	const authService = createAuthService(serviceContext);

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

		request.authenticatedUser = await authService.getAuthenticatedUser({
			provider: "better-auth",
			subject: session.user.id,
		});
	});

	done();
};

export default fp(authentication, { name: "authentication" });
