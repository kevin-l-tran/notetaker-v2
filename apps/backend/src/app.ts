import Fastify, { type FastifyInstance } from "fastify";
import healthRoutes from "./modules/health/health.routes.ts";

export function buildApp(): FastifyInstance {
	const app = Fastify({
		logger: true,
	});

	app.register(healthRoutes, {
		prefix: "/api",
	});

	return app;
}
