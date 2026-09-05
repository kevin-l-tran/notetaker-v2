import type { FastifyPluginCallback } from "fastify";
import authentication from "./modules/auth/auth.plugin.ts";
import authRoutes from "./modules/auth/auth.routes.ts";
import healthRoutes from "./modules/health/health.routes.ts";
import userRoutes from "./modules/users/user.routes.ts";

const routes: FastifyPluginCallback = (app, _options, done) => {
	app.register(authentication);

	app.register(authRoutes);
	app.register(userRoutes);
	app.register(healthRoutes);

	done();
};

export default routes;
