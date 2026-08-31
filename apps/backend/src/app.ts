import Fastify, { type FastifyInstance } from "fastify";

export function buildApp(): FastifyInstance {
	const app = Fastify({
		logger: true,
	});

	return app;
}
