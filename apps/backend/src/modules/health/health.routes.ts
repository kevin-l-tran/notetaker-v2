import type { FastifyPluginCallback } from "fastify";

const healthRoutes: FastifyPluginCallback = (app) => {
	app.get("/health", () => {
		return {
			status: "ok",
		};
	});
};

export default healthRoutes;
