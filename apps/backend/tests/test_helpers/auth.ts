import type { FastifyInstance } from "fastify";
import { db } from "../../src/database/client.ts";
import { appUsers } from "../../src/database/schema/appUsers.ts";

export async function createAuthenticatedUser(app: FastifyInstance) {
	const response = await app.inject({
		method: "POST",
		url: "/api/auth/sign-up/email",
		payload: {
			name: "Test User",
			email: `test-${crypto.randomUUID()}@example.com`,
			password: "test-password-123",
		},
	});

	const sessionCookie = response.cookies.find((cookie) => cookie.name.includes("session"));

	if (!sessionCookie) {
		throw new Error("Expected session cookie.");
	}

	const users = await db.select().from(appUsers);

	const user = users[0];
	if (!user) {
		throw new Error("Expected app user.");
	}

	return {
		user,
		cookies: {
			[sessionCookie.name]: sessionCookie.value,
		},
	};
}
