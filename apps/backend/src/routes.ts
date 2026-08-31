import type { FastifyPluginCallback } from "fastify";
import authRoutes from "./modules/auth/auth.routes.ts";
import meRoutes from "./modules/auth/me.routes.ts";
import healthRoutes from "./modules/health/health.routes.ts";

const routes: FastifyPluginCallback = (app, _options, done) => {
	app.register(authRoutes);
	app.register(meRoutes);
	app.register(healthRoutes);

	done();
};

export default routes;
