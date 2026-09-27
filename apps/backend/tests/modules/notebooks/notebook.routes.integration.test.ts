import { NotebookSummarySchema } from "@notetaker-v2/contracts";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../../src/app.ts";
import { db } from "../../../src/database/client.ts";
import { appUsers } from "../../../src/database/schema/appUsers.ts";
import { notebookMembers } from "../../../src/database/schema/notebookMembers.ts";
import { notebooks } from "../../../src/database/schema/notebooks.ts";
import { createNotebookRepository } from "../../../src/modules/notebooks/notebook.repository.ts";
import { createNotebookMemberRepository } from "../../../src/modules/notebooks/notebookMember.repository.ts";
import { createAuthenticatedUser } from "../../test_helpers/auth.ts";

describe("notebook routes", () => {
	const app = buildApp();

	const notebookRepo = createNotebookRepository(db);
	const notebookMemberRepo = createNotebookMemberRepository(db);

	beforeAll(async () => {
		await app.ready();
	});

	beforeEach(async () => {
		await db.transaction(async (tx) => {
			await tx.delete(notebookMembers);
			await tx.delete(notebooks);
			await tx.delete(appUsers);
		});
	});

	afterAll(async () => {
		await app.close();
	});

	describe("GET /notebooks", () => {
		it("returns 200 with the authenticated user's notebooks", async () => {
			const { user, cookies } = await createAuthenticatedUser(app);

			const notebook = await notebookRepo.create({
				title: "Test Notebook",
			});

			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebook.id,
				role: "owner",
			});

			const response = await app.inject({
				method: "GET",
				url: "/api/notebooks",
				cookies,
			});

			expect(response.statusCode).toBe(200);

			const payloadNotebooks = response.json();

			for (const payloadNotebook of payloadNotebooks) {
				expect(NotebookSummarySchema.safeParse(payloadNotebook).success).toEqual(true);
			}
		});

		it("returns an empty array when the user has no notebooks", async () => {
			const { cookies } = await createAuthenticatedUser(app);

			const response = await app.inject({
				method: "GET",
				url: "/api/notebooks",
				cookies,
			});

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual([]);
		});

		it("returns 401 when the request is unauthenticated", async () => {
			const response = await app.inject({
				method: "GET",
				url: "/api/notebooks",
			});

			expect(response.statusCode).toBe(401);
		});
	});
});
