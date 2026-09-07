import { fromNodeHeaders } from "better-auth/node";
import type { FastifyPluginCallback } from "fastify";
import type { Auth } from "./createAuth.ts";

interface AuthRoutesOptions {
	auth: Auth;
}

const authRoutes: FastifyPluginCallback<AuthRoutesOptions> = (app, options, done) => {
	app.route({
		method: ["GET", "POST"],
		url: "/auth/*",
		async handler(request, reply) {
			// Construct request URL
			const url = new URL(request.url, `http://${request.headers.host}`);

			// Convert Fastify headers to standard Headers object
			const headers = fromNodeHeaders(request.headers);

			// Create Fetch API-compatible request
			const req = new Request(url.toString(), {
				method: request.method,
				headers,
				...(request.body ? { body: JSON.stringify(request.body) } : {}),
			});

			// Process authentication request
			const response = await options.auth.handler(req);

			// Forward response to client
			reply.status(response.status);
			response.headers.forEach((value, key) => {
				reply.header(key, value); // sets a header in reply
				return;
			});
			return reply.send(response.body ? await response.text() : null);
		},
	});

	done();
};

export default authRoutes;
