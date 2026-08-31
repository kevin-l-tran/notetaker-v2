import Fastify, { type FastifyInstance } from "fastify";
import authRoutes from "./modules/auth/auth.routes.ts";
import meRoutes from "./modules/auth/me.routes.ts";
import healthRoutes from "./modules/health/health.routes.ts";

export function buildApp(): FastifyInstance {
	const app = Fastify({
		logger: true,
	});

	app.register(healthRoutes, {
		prefix: "/api",
	});

	app.register(authRoutes, {
		prefix: "/api",
	});

	app.register(meRoutes, {
		prefix: "/api",
	});

	return app;
}
