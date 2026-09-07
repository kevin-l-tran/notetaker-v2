import { fromNodeHeaders } from "better-auth/node";
import type { FastifyPluginCallback, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import type { AppUser } from "../../database/schema/appUsers.ts";
import { UnauthorizedError } from "../../shared/errors/appError.ts";
import type { ServiceContext } from "../../shared/services/serviceContext.ts";
import { createAuthService } from "./auth.service.ts";
import type { Auth } from "./createAuth.ts";

interface AuthenticationOptions {
	serviceContext: ServiceContext;
	auth: Auth;
}

declare module "fastify" {
	interface FastifyRequest {
		authenticatedUser: AppUser | null;
	}

	interface FastifyInstance {
		requireAuthentication(request: FastifyRequest, reply: FastifyReply): Promise<void>;
	}
}

const authentication: FastifyPluginCallback<AuthenticationOptions> = (app, options, done) => {
	const authService = createAuthService(options.serviceContext);

	app.decorateRequest("authenticatedUser", null);

	app.decorate("requireAuthentication", async (request, _reply) => {
		const session = await options.auth.api.getSession({
			headers: fromNodeHeaders(request.headers),
		});

		if (!session) {
			throw new UnauthorizedError();
		}

		request.authenticatedUser = await authService.getAuthenticatedUser({
			provider: "better-auth",
			subject: session.user.id,
		});
	});

	done();
};

export default fp(authentication, { name: "authentication" });
