import { NodeSchema } from "@notetaker-v2/contracts";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../../src/app.ts";
import { db } from "../../../src/database/client.ts";
import { appUsers } from "../../../src/database/schema/appUsers.ts";
import { baseNodes } from "../../../src/database/schema/baseNodes.ts";
import { concepts } from "../../../src/database/schema/concepts.ts";
import { notebookMembers } from "../../../src/database/schema/notebookMembers.ts";
import { notebooks } from "../../../src/database/schema/notebooks.ts";
import { createNotebookRepository } from "../../../src/modules/notebooks/notebook.repository.ts";
import { createNotebookMemberRepository } from "../../../src/modules/notebooks/notebookMember.repository.ts";
import { createAuthenticatedUser } from "../../test_helpers/auth.ts";

describe("node routes", () => {
	const app = buildApp();

	const notebookRepo = createNotebookRepository(db);
	const notebookMemberRepo = createNotebookMemberRepository(db);

	async function createNotebookForUser(
		appUserId: string,
		role: "owner" | "editor" | "viewer" = "owner",
	) {
		const notebook = await notebookRepo.create({ title: "Test Notebook" });

		await notebookMemberRepo.create({
			appUserId,
			notebookId: notebook.id,
			role,
		});

		return notebook;
	}

	async function createTestConcept(
		notebookId: string,
		input: { title?: string; aliases?: string[]; descriptionSource?: string } = {},
	) {
		return await db.transaction(async (tx) => {
			const res = await tx
				.insert(baseNodes)
				.values({
					notebookId,
					type: "concept",
					title: input.title ?? "Original Concept",
					aliases: input.aliases ?? ["Original Alias"],
					isPublished: false,
				})
				.returning();

			const baseNode = res[0];
			if (!baseNode) throw new Error("Failed to create test base node.");

			await tx.insert(concepts).values({
				baseNodeId: baseNode.id,
				descriptionSource: input.descriptionSource ?? "Original description.",
			});

			return baseNode;
		});
	}

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

	describe("GET /notebooks/:notebookId/nodes", () => {
		it("returns 200 with the notebook's nodes", async () => {
			const { user, cookies } = await createAuthenticatedUser(app);
			const notebook = await createNotebookForUser(user.id, "viewer");
			const otherNotebook = await notebookRepo.create({ title: "Other Notebook" });

			const first = await createTestConcept(notebook.id, { title: "First Concept" });
			const second = await createTestConcept(notebook.id, { title: "Second Concept" });
			await createTestConcept(otherNotebook.id, { title: "Other Concept" });

			const response = await app.inject({
				method: "GET",
				url: `/api/notebooks/${notebook.id}/nodes`,
				cookies,
			});

			expect(response.statusCode).toBe(200);

			const payloadNodes = response.json();
			expect(payloadNodes).toHaveLength(2);
			expect(payloadNodes.map((node: { id: string }) => node.id).sort()).toEqual(
				[first.id, second.id].sort(),
			);

			for (const payloadNode of payloadNodes) {
				expect(NodeSchema.safeParse(payloadNode).success).toEqual(true);
			}
		});

		it("returns an empty array when the notebook has no nodes", async () => {
			const { user, cookies } = await createAuthenticatedUser(app);
			const notebook = await createNotebookForUser(user.id);

			const response = await app.inject({
				method: "GET",
				url: `/api/notebooks/${notebook.id}/nodes`,
				cookies,
			});

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual([]);
		});

		it("returns 404 when the user is not a notebook member", async () => {
			const { cookies } = await createAuthenticatedUser(app);
			const notebook = await notebookRepo.create({ title: "Title" });
			await createTestConcept(notebook.id);

			const response = await app.inject({
				method: "GET",
				url: `/api/notebooks/${notebook.id}/nodes`,
				cookies,
			});

			expect(response.statusCode).toBe(404);
			expect(response.json()).toMatchObject({ code: "NOTEBOOK_NOT_FOUND" });
		});

		it("returns 400 when the notebook ID is invalid", async () => {
			const { cookies } = await createAuthenticatedUser(app);

			const response = await app.inject({
				method: "GET",
				url: "/api/notebooks/invalid-id/nodes",
				cookies,
			});

			expect(response.statusCode).toBe(400);
			expect(response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
		});

		it("returns 401 when the request is unauthenticated", async () => {
			const response = await app.inject({
				method: "GET",
				url: `/api/notebooks/${crypto.randomUUID()}/nodes`,
			});

			expect(response.statusCode).toBe(401);
			expect(response.json()).toMatchObject({
				code: "UNAUTHORIZED",
				message: "Authentication required.",
			});
		});
	});

	describe("GET /notebooks/:notebookId/nodes/:id", () => {
		it("returns 200 with the requested concept", async () => {
			const { user, cookies } = await createAuthenticatedUser(app);
			const notebook = await createNotebookForUser(user.id, "viewer");
			const concept = await createTestConcept(notebook.id, {
				title: "Compact Space",
				aliases: ["Compact Spaces"],
				descriptionSource: "Every open cover has a finite subcover.",
			});

			const response = await app.inject({
				method: "GET",
				url: `/api/notebooks/${notebook.id}/nodes/${concept.id}`,
				cookies,
			});

			expect(response.statusCode).toBe(200);

			const payloadNode = response.json();
			expect(NodeSchema.safeParse(payloadNode).success).toEqual(true);
			expect(payloadNode).toMatchObject({
				id: concept.id,
				notebookId: notebook.id,
				type: "concept",
				title: "Compact Space",
				aliases: ["Compact Spaces"],
				descriptionSource: "Every open cover has a finite subcover.",
			});
		});

		it("returns 404 when the node does not exist", async () => {
			const { user, cookies } = await createAuthenticatedUser(app);
			const notebook = await createNotebookForUser(user.id);

			const response = await app.inject({
				method: "GET",
				url: `/api/notebooks/${notebook.id}/nodes/${crypto.randomUUID()}`,
				cookies,
			});

			expect(response.statusCode).toBe(404);
			expect(response.json()).toMatchObject({ code: "NODE_NOT_FOUND" });
		});

		it("returns 404 when the node belongs to another notebook", async () => {
			const { user, cookies } = await createAuthenticatedUser(app);
			const notebook = await createNotebookForUser(user.id);
			const otherNotebook = await createNotebookForUser(user.id);
			const concept = await createTestConcept(otherNotebook.id);

			const response = await app.inject({
				method: "GET",
				url: `/api/notebooks/${notebook.id}/nodes/${concept.id}`,
				cookies,
			});

			expect(response.statusCode).toBe(404);
			expect(response.json()).toMatchObject({ code: "NODE_NOT_FOUND" });
		});

		it("returns 404 when the user is not a notebook member", async () => {
			const { cookies } = await createAuthenticatedUser(app);
			const notebook = await notebookRepo.create({ title: "Title" });
			const concept = await createTestConcept(notebook.id);

			const response = await app.inject({
				method: "GET",
				url: `/api/notebooks/${notebook.id}/nodes/${concept.id}`,
				cookies,
			});

			expect(response.statusCode).toBe(404);
			expect(response.json()).toMatchObject({ code: "NOTEBOOK_NOT_FOUND" });
		});

		it("returns 400 when the node ID is invalid", async () => {
			const { user, cookies } = await createAuthenticatedUser(app);
			const notebook = await createNotebookForUser(user.id);

			const response = await app.inject({
				method: "GET",
				url: `/api/notebooks/${notebook.id}/nodes/invalid-id`,
				cookies,
			});

			expect(response.statusCode).toBe(400);
			expect(response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
		});

		it("returns 401 when the request is unauthenticated", async () => {
			const response = await app.inject({
				method: "GET",
				url: `/api/notebooks/${crypto.randomUUID()}/nodes/${crypto.randomUUID()}`,
			});

			expect(response.statusCode).toBe(401);
			expect(response.json()).toMatchObject({ code: "UNAUTHORIZED" });
		});
	});

	describe("POST /notebooks/:notebookId/nodes", () => {
		it("creates a concept and returns 201 with the created node", async () => {
			const { user, cookies } = await createAuthenticatedUser(app);
			const notebook = await createNotebookForUser(user.id);

			const response = await app.inject({
				method: "POST",
				url: `/api/notebooks/${notebook.id}/nodes`,
				body: {
					type: "concept",
					title: "Compact Space",
					aliases: ["Compact Spaces"],
					descriptionSource: "Every open cover has a finite subcover.",
				},
				cookies,
			});

			expect(response.statusCode).toBe(201);

			const payloadNode = response.json();
			expect(NodeSchema.safeParse(payloadNode).success).toEqual(true);
			expect(payloadNode).toMatchObject({
				notebookId: notebook.id,
				type: "concept",
				title: "Compact Space",
				aliases: ["Compact Spaces"],
				descriptionSource: "Every open cover has a finite subcover.",
			});

			const [dbBaseNode] = await db
				.select()
				.from(baseNodes)
				.where(eq(baseNodes.id, payloadNode.id));
			const [dbConcept] = await db
				.select()
				.from(concepts)
				.where(eq(concepts.baseNodeId, payloadNode.id));

			expect(dbBaseNode).toMatchObject({
				notebookId: notebook.id,
				type: "concept",
				title: "Compact Space",
				aliases: ["Compact Spaces"],
			});
			expect(dbConcept).toMatchObject({
				baseNodeId: payloadNode.id,
				descriptionSource: "Every open cover has a finite subcover.",
			});
		});

		it("allows an editor to create a concept", async () => {
			const { user, cookies } = await createAuthenticatedUser(app);
			const notebook = await createNotebookForUser(user.id, "editor");

			const response = await app.inject({
				method: "POST",
				url: `/api/notebooks/${notebook.id}/nodes`,
				body: {
					type: "concept",
					title: "New Concept",
					aliases: [],
					descriptionSource: "",
				},
				cookies,
			});

			expect(response.statusCode).toBe(201);
			expect(NodeSchema.safeParse(response.json()).success).toEqual(true);
		});

		it("returns 400 when the request body fails validation", async () => {
			const { user, cookies } = await createAuthenticatedUser(app);
			const notebook = await createNotebookForUser(user.id);

			const response = await app.inject({
				method: "POST",
				url: `/api/notebooks/${notebook.id}/nodes`,
				body: {
					type: "concept",
					title: "",
					aliases: ["Alias", "Alias"],
					descriptionSource: "Description",
				},
				cookies,
			});

			expect(response.statusCode).toBe(400);
			expect(response.json()).toMatchObject({
				code: "VALIDATION_ERROR",
				message: "Invalid request.",
			});
		});

		it("returns 400 when the concept description is missing", async () => {
			const { user, cookies } = await createAuthenticatedUser(app);
			const notebook = await createNotebookForUser(user.id);

			const response = await app.inject({
				method: "POST",
				url: `/api/notebooks/${notebook.id}/nodes`,
				body: { type: "concept", title: "Title", aliases: [] },
				cookies,
			});

			expect(response.statusCode).toBe(400);
		});

		it("returns 400 for an unsupported node type", async () => {
			const { user, cookies } = await createAuthenticatedUser(app);
			const notebook = await createNotebookForUser(user.id);

			const response = await app.inject({
				method: "POST",
				url: `/api/notebooks/${notebook.id}/nodes`,
				body: { type: "unknown", title: "Title", aliases: [], descriptionSource: "Text" },
				cookies,
			});

			expect(response.statusCode).toBe(400);
		});

		it("returns 403 when the caller is a viewer", async () => {
			const { user, cookies } = await createAuthenticatedUser(app);
			const notebook = await createNotebookForUser(user.id, "viewer");

			const response = await app.inject({
				method: "POST",
				url: `/api/notebooks/${notebook.id}/nodes`,
				body: { type: "concept", title: "Title", aliases: [], descriptionSource: "Text" },
				cookies,
			});

			expect(response.statusCode).toBe(403);
			expect(response.json()).toMatchObject({ code: "FORBIDDEN" });
		});

		it("returns 404 when the user is not a notebook member", async () => {
			const { cookies } = await createAuthenticatedUser(app);
			const notebook = await notebookRepo.create({ title: "Title" });

			const response = await app.inject({
				method: "POST",
				url: `/api/notebooks/${notebook.id}/nodes`,
				body: { type: "concept", title: "Title", aliases: [], descriptionSource: "Text" },
				cookies,
			});

			expect(response.statusCode).toBe(404);
			expect(response.json()).toMatchObject({ code: "NOTEBOOK_NOT_FOUND" });
		});

		it("returns 401 when the request is unauthenticated", async () => {
			const response = await app.inject({
				method: "POST",
				url: `/api/notebooks/${crypto.randomUUID()}/nodes`,
				body: { type: "concept", title: "Title", aliases: [], descriptionSource: "Text" },
			});

			expect(response.statusCode).toBe(401);
			expect(response.json()).toMatchObject({ code: "UNAUTHORIZED" });
		});
	});

	describe("PATCH /notebooks/:notebookId/nodes/:id", () => {
		it("updates a concept and returns 200", async () => {
			const { user, cookies } = await createAuthenticatedUser(app);
			const notebook = await createNotebookForUser(user.id);
			const concept = await createTestConcept(notebook.id);

			const response = await app.inject({
				method: "PATCH",
				url: `/api/notebooks/${notebook.id}/nodes/${concept.id}`,
				body: {
					type: "concept",
					title: "Updated Title",
					aliases: ["Updated Alias"],
					isPublished: true,
					descriptionSource: "Updated description.",
				},
				cookies,
			});

			expect(response.statusCode).toBe(200);

			const payloadNode = response.json();
			expect(NodeSchema.safeParse(payloadNode).success).toEqual(true);
			expect(payloadNode).toMatchObject({
				id: concept.id,
				type: "concept",
				title: "Updated Title",
				aliases: ["Updated Alias"],
				isPublished: true,
				descriptionSource: "Updated description.",
			});

			const [dbBaseNode] = await db.select().from(baseNodes).where(eq(baseNodes.id, concept.id));
			const [dbConcept] = await db
				.select()
				.from(concepts)
				.where(eq(concepts.baseNodeId, concept.id));

			expect(dbBaseNode).toMatchObject({
				title: "Updated Title",
				aliases: ["Updated Alias"],
			});
			expect(dbConcept).toMatchObject({ descriptionSource: "Updated description." });
		});

		it("accepts partial updates without changing other fields", async () => {
			const { user, cookies } = await createAuthenticatedUser(app);
			const notebook = await createNotebookForUser(user.id, "editor");
			const concept = await createTestConcept(notebook.id);

			const response1 = await app.inject({
				method: "PATCH",
				url: `/api/notebooks/${notebook.id}/nodes/${concept.id}`,
				body: { type: "concept", title: "New Title" },
				cookies,
			});

			const response2 = await app.inject({
				method: "PATCH",
				url: `/api/notebooks/${notebook.id}/nodes/${concept.id}`,
				body: { type: "concept", descriptionSource: "New description." },
				cookies,
			});

			expect(response1.statusCode).toBe(200);
			expect(response2.statusCode).toBe(200);
			expect(response2.json()).toMatchObject({
				title: "New Title",
				aliases: ["Original Alias"],
				descriptionSource: "New description.",
				isPublished: false,
			});
		});

		it("returns 400 when no editable fields are supplied", async () => {
			const { user, cookies } = await createAuthenticatedUser(app);
			const notebook = await createNotebookForUser(user.id);
			const concept = await createTestConcept(notebook.id);

			const response = await app.inject({
				method: "PATCH",
				url: `/api/notebooks/${notebook.id}/nodes/${concept.id}`,
				body: { type: "concept" },
				cookies,
			});

			expect(response.statusCode).toBe(400);
			expect(response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
		});

		it("returns 400 when the request body fails validation", async () => {
			const { user, cookies } = await createAuthenticatedUser(app);
			const notebook = await createNotebookForUser(user.id);
			const concept = await createTestConcept(notebook.id);

			const response = await app.inject({
				method: "PATCH",
				url: `/api/notebooks/${notebook.id}/nodes/${concept.id}`,
				body: { type: "concept", aliases: ["Repeated", "Repeated"] },
				cookies,
			});

			expect(response.statusCode).toBe(400);
			expect(response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
		});

		it("returns 400 when the request type is invalid", async () => {
			const { user, cookies } = await createAuthenticatedUser(app);
			const notebook = await createNotebookForUser(user.id);
			const concept = await createTestConcept(notebook.id);

			const response = await app.inject({
				method: "PATCH",
				url: `/api/notebooks/${notebook.id}/nodes/${concept.id}`,
				body: { type: "claim", title: "New Title" },
				cookies,
			});

			expect(response.statusCode).toBe(400);
		});

		it("returns 404 when the node does not exist", async () => {
			const { user, cookies } = await createAuthenticatedUser(app);
			const notebook = await createNotebookForUser(user.id);

			const response = await app.inject({
				method: "PATCH",
				url: `/api/notebooks/${notebook.id}/nodes/${crypto.randomUUID()}`,
				body: { type: "concept", title: "New Title" },
				cookies,
			});

			expect(response.statusCode).toBe(404);
			expect(response.json()).toMatchObject({ code: "NODE_NOT_FOUND" });
		});

		it("returns 404 when the node belongs to another notebook", async () => {
			const { user, cookies } = await createAuthenticatedUser(app);
			const notebook = await createNotebookForUser(user.id);
			const otherNotebook = await createNotebookForUser(user.id);
			const concept = await createTestConcept(otherNotebook.id);

			const response = await app.inject({
				method: "PATCH",
				url: `/api/notebooks/${notebook.id}/nodes/${concept.id}`,
				body: { type: "concept", title: "New Title" },
				cookies,
			});

			expect(response.statusCode).toBe(404);
		});

		it("returns 403 when the caller is a viewer", async () => {
			const { user, cookies } = await createAuthenticatedUser(app);
			const notebook = await createNotebookForUser(user.id, "viewer");
			const concept = await createTestConcept(notebook.id);

			const response = await app.inject({
				method: "PATCH",
				url: `/api/notebooks/${notebook.id}/nodes/${concept.id}`,
				body: { type: "concept", title: "New Title" },
				cookies,
			});

			expect(response.statusCode).toBe(403);
			expect(response.json()).toMatchObject({ code: "FORBIDDEN" });
		});

		it("returns 401 when the request is unauthenticated", async () => {
			const response = await app.inject({
				method: "PATCH",
				url: `/api/notebooks/${crypto.randomUUID()}/nodes/${crypto.randomUUID()}`,
				body: { type: "concept", title: "New Title" },
			});

			expect(response.statusCode).toBe(401);
			expect(response.json()).toMatchObject({ code: "UNAUTHORIZED" });
		});
	});

	describe("DELETE /notebooks/:notebookId/nodes/:id", () => {
		it("deletes a concept and returns 204", async () => {
			const { user, cookies } = await createAuthenticatedUser(app);
			const notebook = await createNotebookForUser(user.id);
			const concept = await createTestConcept(notebook.id);

			const response = await app.inject({
				method: "DELETE",
				url: `/api/notebooks/${notebook.id}/nodes/${concept.id}`,
				cookies,
			});

			expect(response.statusCode).toBe(204);
			expect(response.body).toBe("");

			const dbBaseNode = await db.select().from(baseNodes).where(eq(baseNodes.id, concept.id));
			const dbConcept = await db.select().from(concepts).where(eq(concepts.baseNodeId, concept.id));

			expect(dbBaseNode).toHaveLength(0);
			expect(dbConcept).toHaveLength(0);
		});

		it("allows an editor to delete a concept", async () => {
			const { user, cookies } = await createAuthenticatedUser(app);
			const notebook = await createNotebookForUser(user.id, "editor");
			const concept = await createTestConcept(notebook.id);

			const response = await app.inject({
				method: "DELETE",
				url: `/api/notebooks/${notebook.id}/nodes/${concept.id}`,
				cookies,
			});

			expect(response.statusCode).toBe(204);
		});

		it("returns 404 when the node does not exist", async () => {
			const { user, cookies } = await createAuthenticatedUser(app);
			const notebook = await createNotebookForUser(user.id);

			const response = await app.inject({
				method: "DELETE",
				url: `/api/notebooks/${notebook.id}/nodes/${crypto.randomUUID()}`,
				cookies,
			});

			expect(response.statusCode).toBe(404);
			expect(response.json()).toMatchObject({ code: "NODE_NOT_FOUND" });
		});

		it("returns 404 when the node belongs to another notebook", async () => {
			const { user, cookies } = await createAuthenticatedUser(app);
			const notebook = await createNotebookForUser(user.id);
			const otherNotebook = await createNotebookForUser(user.id);
			const concept = await createTestConcept(otherNotebook.id);

			const response = await app.inject({
				method: "DELETE",
				url: `/api/notebooks/${notebook.id}/nodes/${concept.id}`,
				cookies,
			});

			expect(response.statusCode).toBe(404);

			const remaining = await db.select().from(baseNodes).where(eq(baseNodes.id, concept.id));
			expect(remaining).toHaveLength(1);
		});

		it("returns 403 when the caller is a viewer", async () => {
			const { user, cookies } = await createAuthenticatedUser(app);
			const notebook = await createNotebookForUser(user.id, "viewer");
			const concept = await createTestConcept(notebook.id);

			const response = await app.inject({
				method: "DELETE",
				url: `/api/notebooks/${notebook.id}/nodes/${concept.id}`,
				cookies,
			});

			expect(response.statusCode).toBe(403);
			expect(response.json()).toMatchObject({ code: "FORBIDDEN" });
		});

		it("returns 401 when the request is unauthenticated", async () => {
			const response = await app.inject({
				method: "DELETE",
				url: `/api/notebooks/${crypto.randomUUID()}/nodes/${crypto.randomUUID()}`,
			});

			expect(response.statusCode).toBe(401);
			expect(response.json()).toMatchObject({ code: "UNAUTHORIZED" });
		});
	});
});
