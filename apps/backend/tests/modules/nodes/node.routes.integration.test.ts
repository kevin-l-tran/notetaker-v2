import {
	CreateNodeResponseSchema,
	GetNodeResponseSchema,
	GetNodesResponseSchema,
} from "@notetaker-v2/contracts";
import {
	createDocumentFromRevision,
	decodeDocument,
	encodeDocument,
	extractDraftContent,
	type PublishableNodeContent,
} from "@notetaker-v2/node_document";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../../../src/app.ts";
import { db } from "../../../src/database/client.ts";
import { appUsers } from "../../../src/database/schema/appUsers.ts";
import { notebookMembers } from "../../../src/database/schema/notebookMembers.ts";
import { notebooks } from "../../../src/database/schema/notebooks.ts";
import { createNodeDraftRepository } from "../../../src/modules/nodes/drafts/nodeDraft.repository.ts";
import { createNodeDraftService } from "../../../src/modules/nodes/drafts/nodeDraft.service.ts";
import { createNodeRepository } from "../../../src/modules/nodes/node.repository.ts";
import { createBaseNodeRevisionRepository } from "../../../src/modules/nodes/revisions/baseNodeRevision.repository.ts";
import { createClaimRevisionRepository } from "../../../src/modules/nodes/revisions/claimRevision.repository.ts";
import { createConceptRevisionRepository } from "../../../src/modules/nodes/revisions/conceptRevision.repository.ts";
import { createNotebookRepository } from "../../../src/modules/notebooks/notebook.repository.ts";
import { createNotebookMemberRepository } from "../../../src/modules/notebooks/notebookMember.repository.ts";
import { createServiceContext } from "../../../src/shared/services/serviceContext.ts";
import { createAuthenticatedUser } from "../../test_helpers/auth.ts";

describe("node routes", () => {
	const app = buildApp();

	const notebookRepo = createNotebookRepository(db);
	const notebookMemberRepo = createNotebookMemberRepository(db);
	const nodeRepo = createNodeRepository(db);
	const draftRepo = createNodeDraftRepository(db);
	const baseRevisionRepo = createBaseNodeRevisionRepository(db);
	const conceptRevisionRepo = createConceptRevisionRepository(db);
	const claimRevisionRepo = createClaimRevisionRepository(db);
	const draftService = createNodeDraftService(createServiceContext(db));

	const conceptContent = {
		type: "concept",
		title: "Vector Space",
		aliases: [{ text: "Linear Space", mode: "auto" }],
		excludedAliases: [],
		descriptionSource: "A vector space is...",
	} satisfies PublishableNodeContent;

	const claimContent = {
		type: "claim",
		title: "Dimension Theorem",
		aliases: [{ text: "Dimension Claim", mode: "manual" }],
		excludedAliases: [],
		predicateSource: "Let V be a vector space.",
		resultSource: "The dimension is finite.",
		justificationSource: "By the basis theorem.",
	} satisfies PublishableNodeContent;

	async function createNotebookAndUser(role: "owner" | "editor" | "viewer" = "owner") {
		const { user, cookies } = await createAuthenticatedUser(app);
		const notebook = await notebookRepo.create({ title: "Notebook" });
		await notebookMemberRepo.create({ appUserId: user.id, notebookId: notebook.id, role });
		return { user, cookies, notebook };
	}

	async function insertNodeWithDraft(notebookId: string, content: PublishableNodeContent) {
		const node = await nodeRepo.create({ notebookId, type: content.type });
		const document = createDocumentFromRevision(content);

		try {
			const draft = await draftRepo.create({
				nodeId: node.id,
				yjsState: Buffer.from(encodeDocument(document)),
			});

			return { node, draft };
		} finally {
			document.destroy();
		}
	}

	async function createPublishedNode(
		notebookId: string,
		content: PublishableNodeContent,
		revisionNumber = 1,
	) {
		const node = await nodeRepo.create({ notebookId, type: content.type });
		const baseRevision = await baseRevisionRepo.create({
			nodeId: node.id,
			revisionNumber,
			title: content.title,
			aliases: content.aliases,
			excludedAliases: content.excludedAliases,
		});

		if (content.type === "concept") {
			await conceptRevisionRepo.create({
				baseNodeRevisionId: baseRevision.id,
				descriptionSource: content.descriptionSource,
			});
		} else {
			await claimRevisionRepo.create({
				baseNodeRevisionId: baseRevision.id,
				predicateSource: content.predicateSource,
				resultSource: content.resultSource,
				justificationSource: content.justificationSource,
			});
		}

		return { node, baseRevision };
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
		it("returns 200 with an empty node array and the notebook publication version", async () => {
			const { notebook, cookies } = await createNotebookAndUser("viewer");

			const response = await app.inject({
				method: "GET",
				url: `/api/notebooks/${notebook.id}/nodes`,
				cookies,
			});

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual({ publicationVersion: 1, nodes: [] });
			expect(GetNodesResponseSchema.safeParse(response.json()).success).toEqual(true);
		});

		it("includes a draft-only node without a published revision", async () => {
			const { notebook, cookies } = await createNotebookAndUser("editor");
			const { node } = await insertNodeWithDraft(notebook.id, conceptContent);

			const response = await app.inject({
				method: "GET",
				url: `/api/notebooks/${notebook.id}/nodes`,
				cookies,
			});

			expect(response.statusCode).toBe(200);
			expect(GetNodesResponseSchema.safeParse(response.json()).success).toEqual(true);
			expect(response.json()).toMatchObject({
				publicationVersion: 1,
				nodes: [
					{
						id: node.id,
						notebookId: notebook.id,
						type: "concept",
						hasDraft: true,
						latestRevision: null,
					},
				],
			});
			expect((await draftRepo.findByNodeId({ nodeId: node.id }))?.nodeId).toEqual(node.id);
		});

		it("returns full latest published concept and claim revisions", async () => {
			const { notebook, cookies } = await createNotebookAndUser("viewer");
			const { node: concept } = await createPublishedNode(notebook.id, {
				...conceptContent,
				title: "Previous Title",
			});
			const latest = await baseRevisionRepo.create({
				nodeId: concept.id,
				revisionNumber: 2,
				title: conceptContent.title,
				aliases: conceptContent.aliases,
				excludedAliases: conceptContent.excludedAliases,
			});
			await conceptRevisionRepo.create({
				baseNodeRevisionId: latest.id,
				descriptionSource: conceptContent.descriptionSource,
			});
			const { node: claim } = await createPublishedNode(notebook.id, claimContent);

			const response = await app.inject({
				method: "GET",
				url: `/api/notebooks/${notebook.id}/nodes`,
				cookies,
			});

			expect(response.statusCode).toBe(200);
			const payload = response.json();
			expect(GetNodesResponseSchema.safeParse(payload).success).toEqual(true);
			expect(payload.nodes).toHaveLength(2);
			expect(payload.nodes).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						id: concept.id,
						hasDraft: false,
						latestRevision: expect.objectContaining({
							revisionNumber: 2,
							title: conceptContent.title,
							aliases: conceptContent.aliases,
							descriptionSource: conceptContent.descriptionSource,
						}),
					}),
					expect.objectContaining({
						id: claim.id,
						hasDraft: false,
						latestRevision: expect.objectContaining({
							type: "claim",
							predicateSource: claimContent.predicateSource,
							resultSource: claimContent.resultSource,
							justificationSource: claimContent.justificationSource,
						}),
					}),
				]),
			);
		});

		it("returns the updated publication version and revision after publishing", async () => {
			const { user, notebook, cookies } = await createNotebookAndUser("owner");
			const { node, draft } = await insertNodeWithDraft(notebook.id, conceptContent);

			const before = await app.inject({
				method: "GET",
				url: `/api/notebooks/${notebook.id}/nodes`,
				cookies,
			});
			expect(before.json()).toMatchObject({ publicationVersion: 1 });

			const published = await draftService.publishDraft({
				appUserId: user.id,
				notebookId: notebook.id,
				nodeId: node.id,
				draftId: draft.id,
				expectedSaveVersion: draft.saveVersion,
			});

			const response = await app.inject({
				method: "GET",
				url: `/api/notebooks/${notebook.id}/nodes`,
				cookies,
			});
			expect(response.statusCode).toBe(200);
			expect(GetNodesResponseSchema.safeParse(response.json()).success).toEqual(true);
			expect(response.json()).toMatchObject({
				publicationVersion: published.publicationVersion,
				nodes: [
					{
						id: node.id,
						hasDraft: false,
						latestRevision: { revisionNumber: 1, title: conceptContent.title },
					},
				],
			});
			expect(published.publicationVersion).toEqual(2);
		});

		it("returns 404 when the user is not a notebook member", async () => {
			const { cookies } = await createAuthenticatedUser(app);
			const notebook = await notebookRepo.create({ title: "Notebook" });

			const response = await app.inject({
				method: "GET",
				url: `/api/notebooks/${notebook.id}/nodes`,
				cookies,
			});

			expect(response.statusCode).toBe(404);
			expect(response.json()).toMatchObject({ code: "NOTEBOOK_NOT_FOUND" });
		});
	});

	describe("GET /notebooks/:notebookId/nodes/:nodeId", () => {
		it("returns the node with its latest published content", async () => {
			const { notebook, cookies } = await createNotebookAndUser("viewer");
			const { node } = await createPublishedNode(notebook.id, claimContent);

			const response = await app.inject({
				method: "GET",
				url: `/api/notebooks/${notebook.id}/nodes/${node.id}`,
				cookies,
			});

			expect(response.statusCode).toBe(200);
			expect(GetNodeResponseSchema.safeParse(response.json()).success).toEqual(true);
			expect(response.json()).toMatchObject({
				node: {
					id: node.id,
					hasDraft: false,
					latestRevision: {
						title: claimContent.title,
						predicateSource: claimContent.predicateSource,
					},
				},
			});
		});
	});

	describe("POST /notebooks/:notebookId/nodes", () => {
		it("returns 201 with a node and a Base64-encoded Yjs draft", async () => {
			const { notebook, cookies } = await createNotebookAndUser("editor");

			const response = await app.inject({
				method: "POST",
				url: `/api/notebooks/${notebook.id}/nodes`,
				body: { type: "concept" },
				cookies,
			});

			expect(response.statusCode).toBe(201);
			const payload = response.json();
			expect(CreateNodeResponseSchema.safeParse(payload).success).toEqual(true);
			expect(payload.node).toMatchObject({
				notebookId: notebook.id,
				type: "concept",
				hasDraft: true,
				latestRevision: null,
			});
			expect(payload.draft).toMatchObject({ nodeId: payload.node.id, saveVersion: 1 });
			expect(typeof payload.draft.state).toEqual("string");

			const bytes = Buffer.from(payload.draft.state, "base64");
			const document = decodeDocument(bytes);
			try {
				expect(extractDraftContent(document, "concept")).toEqual({
					type: "concept",
					title: "",
					aliases: [],
					excludedAliases: [],
					descriptionSource: "",
				});
			} finally {
				document.destroy();
			}
			const stored = await draftRepo.findByNodeId({ nodeId: payload.node.id });
			expect(bytes).toEqual(stored?.yjsState);
		});

		it("returns 400 when the request body is invalid", async () => {
			const { notebook, cookies } = await createNotebookAndUser();
			const response = await app.inject({
				method: "POST",
				url: `/api/notebooks/${notebook.id}/nodes`,
				body: { type: "unknown" },
				cookies,
			});

			expect(response.statusCode).toBe(400);
			expect(response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
		});
	});

	describe("DELETE /notebooks/:notebookId/nodes/:nodeId", () => {
		it("deletes an unpublished node without incrementing the publication version", async () => {
			const { notebook, cookies } = await createNotebookAndUser("editor");
			const { node } = await insertNodeWithDraft(notebook.id, conceptContent);

			const response = await app.inject({
				method: "DELETE",
				url: `/api/notebooks/${notebook.id}/nodes/${node.id}`,
				cookies,
			});

			expect(response.statusCode).toBe(204);
			expect(response.body).toEqual("");
			expect(
				await nodeRepo.findByIdAndNotebookId({ id: node.id, notebookId: notebook.id }),
			).toBeUndefined();
			expect((await notebookRepo.findById({ id: notebook.id }))?.publicationVersion).toEqual(1);
		});

		it("deletes a published node and increments the publication version", async () => {
			const { notebook, cookies } = await createNotebookAndUser("owner");
			const { node } = await createPublishedNode(notebook.id, conceptContent);

			const response = await app.inject({
				method: "DELETE",
				url: `/api/notebooks/${notebook.id}/nodes/${node.id}`,
				cookies,
			});

			expect(response.statusCode).toBe(204);
			expect(
				await nodeRepo.findByIdAndNotebookId({ id: node.id, notebookId: notebook.id }),
			).toBeUndefined();
			expect(await baseRevisionRepo.findForNode({ nodeId: node.id })).toEqual([]);
			expect((await notebookRepo.findById({ id: notebook.id }))?.publicationVersion).toEqual(2);
		});

		it("returns 403 for viewers without deleting the node", async () => {
			const { notebook, cookies } = await createNotebookAndUser("viewer");
			const { node } = await createPublishedNode(notebook.id, conceptContent);

			const response = await app.inject({
				method: "DELETE",
				url: `/api/notebooks/${notebook.id}/nodes/${node.id}`,
				cookies,
			});

			expect(response.statusCode).toBe(403);
			expect(
				await nodeRepo.findByIdAndNotebookId({ id: node.id, notebookId: notebook.id }),
			).toEqual(node);
		});
	});

	it("returns 401 when a node request is unauthenticated", async () => {
		const { notebook } = await createNotebookAndUser();

		const response = await app.inject({
			method: "GET",
			url: `/api/notebooks/${notebook.id}/nodes`,
		});

		expect(response.statusCode).toBe(401);
		expect(response.json()).toMatchObject({ code: "UNAUTHORIZED" });
	});
});
