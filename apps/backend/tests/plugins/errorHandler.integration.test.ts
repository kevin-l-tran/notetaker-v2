import Fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import errorHandler from "../../src/plugins/errorHandler.plugin.ts";
import { NotFoundError, UnauthorizedError } from "../../src/shared/errors/appError.ts";

describe("errorHandler", () => {
	let app: ReturnType<typeof Fastify>;

	beforeEach(async () => {
		app = Fastify();

		await app.register(errorHandler);

		app.get("/not-found", () => {
			throw new NotFoundError("USER_NOT_FOUND", "User not found.");
		});

		app.get("/unauthorized", () => {
			throw new UnauthorizedError("Authentication required.");
		});

		app.post(
			"/validation",
			{
				schema: {
					body: {
						type: "object",
						required: ["name"],
						properties: {
							name: { type: "string" },
						},
					},
				},
			},
			async () => ({ ok: true }),
		);

		app.get("/unexpected", () => {
			throw new Error("database password is super-secret");
		});

		await app.ready();
	});

	afterEach(async () => {
		await app.close();
	});

	it("returns a public response for an AppError", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/not-found",
		});

		expect(response.statusCode).toBe(404);

		expect(response.json()).toEqual({
			code: "USER_NOT_FOUND",
			message: "User not found.",
		});
	});

	it("returns 401 for an unauthorized error", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/unauthorized",
		});

		expect(response.statusCode).toBe(401);

		expect(response.json()).toEqual({
			code: "UNAUTHORIZED",
			message: "Authentication required.",
		});
	});

	it("normalizes Fastify validation errors", async () => {
		const response = await app.inject({
			method: "POST",
			url: "/validation",
			payload: {},
		});

		expect(response.statusCode).toBe(400);

		const body = response.json();

		expect(body.code).toBe("VALIDATION_ERROR");
		expect(body.message).toBe("Invalid request.");
		expect(body.details).toBeDefined();
	});

	it("hides unexpected error details from the client", async () => {
		const response = await app.inject({
			method: "GET",
			url: "/unexpected",
		});

		expect(response.statusCode).toBe(500);

		expect(response.json()).toEqual({
			code: "INTERNAL_SERVER_ERROR",
			message: "Internal server error.",
		});

		expect(response.body).not.toContain("database password");
		expect(response.body).not.toContain("super-secret");
	});
});
