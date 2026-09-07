import type { FastifyPluginCallback } from "fastify";
import authentication from "./modules/auth/auth.plugin.ts";
import authRoutes from "./modules/auth/auth.routes.ts";
import type { Auth } from "./modules/auth/createAuth.ts";
import healthRoutes from "./modules/health/health.routes.ts";
import userRoutes from "./modules/users/user.routes.ts";
import type { ServiceContext } from "./shared/services/serviceContext.ts";

interface RoutesOptions {
	serviceContext: ServiceContext;
	auth: Auth;
}

const routes: FastifyPluginCallback<RoutesOptions> = (app, options, done) => {
	app.register(authentication, {
		serviceContext: options.serviceContext,
		auth: options.auth,
	});

	app.register(authRoutes, {
		auth: options.auth,
	});
	app.register(userRoutes);
	app.register(healthRoutes);

	done();
};

export default routes;
