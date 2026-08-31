import Fastify, { type FastifyInstance } from "fastify";
import routes from "./routes.ts";

export function buildApp(): FastifyInstance {
	const app = Fastify({
		logger: true,
	});

	app.register(routes, {
		prefix: "/api",
	});

	return app;
}
