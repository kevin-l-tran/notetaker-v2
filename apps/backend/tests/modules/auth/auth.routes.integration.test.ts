import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../../src/app.ts";
import { db } from "../../../src/database/client.ts";
import { appUsers } from "../../../src/database/schema/appUsers.ts";
import { account, session, user, verification } from "../../../src/database/schema/auth.ts";
import { authIdentities } from "../../../src/database/schema/authIdentities.ts";

describe("authentication routes", () => {
	const app = buildApp();

	beforeAll(async () => {
		await app.ready();
	});

	beforeEach(async () => {
		await db.transaction(async (tx) => {
			// Delete children before parents because of foreign keys.
			await tx.delete(authIdentities);
			await tx.delete(session);
			await tx.delete(account);
			await tx.delete(verification);
			await tx.delete(appUsers);
			await tx.delete(user);
		});
	});

	afterAll(async () => {
		await app.close();
	});

	it("signs up, provisions an app user, authenticates /me, then signs out", async () => {
		// 1. /me should reject an unauthenticated request.
		const unauthenticatedResponse = await app.inject({
			method: "GET",
			url: "/api/me",
		});

		expect(unauthenticatedResponse.statusCode).toBe(401);

		// 2. Sign up through the actual Better Auth HTTP route.
		const signUpResponse = await app.inject({
			method: "POST",
			url: "/api/auth/sign-up/email",
			payload: {
				name: "Test User",
				email: "test@example.com",
				password: "test-password-123",
			},
		});

		expect(signUpResponse.statusCode).toBe(200);

		// 3. Verify Better Auth and your application provisioning both ran.
		const authUsers = await db.select().from(user);
		const applicationUsers = await db.select().from(appUsers);
		const identities = await db.select().from(authIdentities);

		expect(authUsers).toHaveLength(1);
		expect(applicationUsers).toHaveLength(1);
		expect(identities).toHaveLength(1);

		expect(identities[0]?.providerSubject).toBe(authUsers[0]?.id);
		expect(identities[0]?.appUserId).toBe(applicationUsers[0]?.id);

		// 4. Capture the session cookie Better Auth returned.
		const sessionCookie = signUpResponse.cookies.find((cookie) => cookie.name.includes("session"));

		expect(sessionCookie).toBeDefined();

		if (!sessionCookie) {
			throw new Error("Expected Better Auth to return a session cookie.");
		}

		// 5. Send the session cookie to /me.
		const meResponse = await app.inject({
			method: "GET",
			url: "/api/me",
			cookies: {
				[sessionCookie.name]: sessionCookie.value,
			},
		});

		expect(meResponse.statusCode).toBe(200);

		expect(meResponse.json()).toMatchObject({
			id: applicationUsers[0]?.id,
			email: "test@example.com",
		});

		// 6. Sign out using the same session.
		const signOutResponse = await app.inject({
			method: "POST",
			url: "/api/auth/sign-out",
			cookies: {
				[sessionCookie.name]: sessionCookie.value,
			},
		});

		expect(signOutResponse.statusCode).toBe(200);

		// 7. Deliberately send the OLD cookie again.
		//    The server should no longer accept its session.
		const afterSignOutResponse = await app.inject({
			method: "GET",
			url: "/api/me",
			cookies: {
				[sessionCookie.name]: sessionCookie.value,
			},
		});

		expect(afterSignOutResponse.statusCode).toBe(401);
	});
});
