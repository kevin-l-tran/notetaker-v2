import type { FastifyRequest } from "fastify";
import type { AppUser } from "../../database/schema/appUsers.ts";

export function getAuthenticatedUser(request: FastifyRequest): AppUser {
	if (!request.authenticatedUser) {
		throw new Error("Expected authenticated request.");
	}

	return request.authenticatedUser;
}
