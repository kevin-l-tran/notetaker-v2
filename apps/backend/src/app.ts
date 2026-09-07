import Fastify, { type FastifyInstance } from "fastify";
import { db } from "./database/client.ts";
import { createAuth } from "./modules/auth/createAuth.ts";
import errorHandler from "./plugins/errorHandler.plugin.ts";
import routes from "./routes.ts";
import { createServiceContext } from "./shared/services/serviceContext.ts";

export function buildApp(): FastifyInstance {
	const app = Fastify({
		logger: true,
	});

	const serviceContext = createServiceContext(db);
	const auth = createAuth({ database: db, context: serviceContext });

	app.register(errorHandler);
	app.register(routes, {
		prefix: "/api",
		serviceContext,
		auth,
	});

	return app;
}
