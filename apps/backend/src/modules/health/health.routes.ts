import type { FastifyPluginCallback } from "fastify";

const healthRoutes: FastifyPluginCallback = (app, _options, done) => {
	app.get("/health", () => {
		return {
			status: "ok",
		};
	});

	done();
};

export default healthRoutes;
