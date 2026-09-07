import Fastify, { type FastifyInstance } from "fastify";
import errorHandler from "./plugins/errorHandler.plugin.ts";
import routes from "./routes.ts";

export function buildApp(): FastifyInstance {
	const app = Fastify({
		logger: true,
	});

	app.register(errorHandler);

	app.register(routes, {
		prefix: "/api",
	});

	return app;
}
