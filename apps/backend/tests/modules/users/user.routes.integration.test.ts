import { UserSchema } from "@notetaker-v2/contracts";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../../src/app.ts";
import { db } from "../../../src/database/client.ts";
import { appUsers } from "../../../src/database/schema/appUsers.ts";
import { createAuthenticatedUser } from "../../test_helpers/auth.ts";

describe("user routes", () => {
	const app = buildApp();

	beforeAll(async () => {
		await app.ready();
	});

	beforeEach(async () => {
		await db.transaction(async (tx) => {
			await tx.delete(appUsers);
		});
	});

	afterAll(async () => {
		await app.close();
	});

	describe("GET /me", () => {
		it("returns 200 with the authenticated user", async () => {
			const { cookies } = await createAuthenticatedUser(app);

			const response = await app.inject({
				method: "GET",
				url: "/api/me",
				cookies,
			});

			expect(response.statusCode).toBe(200);

			const payloadUser = response.json();

			expect(UserSchema.safeParse(payloadUser).success).toEqual(true);
		});
	});
});
