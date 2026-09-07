import type { FastifyRequest } from "fastify";
import type { AppUser } from "../../database/schema/appUsers.ts";
import { UnauthorizedError } from "../../shared/errors/appError.ts";

export function getAuthenticatedUser(request: FastifyRequest): AppUser {
	if (!request.authenticatedUser) {
		throw new UnauthorizedError();
	}

	return request.authenticatedUser;
}
