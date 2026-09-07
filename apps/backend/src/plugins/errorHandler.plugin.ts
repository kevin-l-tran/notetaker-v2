import type { ApiErrorResponse } from "@notetaker-v2/contracts";
import type { FastifyPluginCallback } from "fastify";
import fp from "fastify-plugin";
import { AppError } from "../shared/errors/appError.ts";

const errorHandler: FastifyPluginCallback = (app, _options, done) => {
	app.setErrorHandler((error, request, reply) => {
		if (error instanceof AppError && error.statusCode < 500) {
			const publicError: ApiErrorResponse = {
				code: error.code,
				message: error.message,
				details: error.details,
			};

			return reply.status(error.statusCode).send(publicError);
		}

		if (isFastifyValidationError(error)) {
			const publicError: ApiErrorResponse = {
				code: "VALIDATION_ERROR",
				message: "Invalid request.",
				details: {
					context: error.validationContext,
					issues: error.validation,
				},
			};

			return reply.status(400).send(publicError);
		}

		request.log.error({ err: error }, "unhandled error");

		const publicError: ApiErrorResponse = {
			code: "INTERNAL_SERVER_ERROR",
			message: "Internal server error.",
		};
		reply.status(500).send(publicError);
	});

	done();
};

function isFastifyValidationError(
	error: unknown,
): error is { validation: unknown[]; validationContext?: string } {
	return (
		typeof error === "object" &&
		error !== null &&
		"validation" in error &&
		Array.isArray(error.validation) &&
		(("validationContext" in error && typeof error.validationContext === "string") ||
			!("validationContext" in error))
	);
}

export default fp(errorHandler, { name: "error-handler" });
