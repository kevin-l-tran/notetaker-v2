import type { User } from "@notetaker-v2/contracts";
import type { FastifyRequest } from "fastify";

export function getAuthenticatedUser(request: FastifyRequest): User {
	if (!request.authenticatedUser) {
		throw new Error("Expected authenticated request.");
	}

	return request.authenticatedUser;
}
