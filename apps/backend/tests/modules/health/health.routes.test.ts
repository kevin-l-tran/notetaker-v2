import { describe, expect, it } from "vitest";
import { buildApp } from "../../../src/app.ts";

describe("health route", () => {
	it("reports that the API is healthy", async () => {
		const app = buildApp();

		const response = await app.inject({
			method: "GET",
			url: "/api/health",
		});

		expect(response.statusCode).toBe(200);
		expect(response.json()).toEqual({
			status: "ok",
		});

		await app.close();
	});
});
