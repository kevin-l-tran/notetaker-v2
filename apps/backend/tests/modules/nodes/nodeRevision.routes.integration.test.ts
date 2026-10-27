import {
	NodeDraftSchema,
	NodeRevisionSchema,
	NodeRevisionSummarySchema,
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
import { createNodeRepository } from "../../../src/modules/nodes/node.repository.ts";
import { createBaseNodeRevisionRepository } from "../../../src/modules/nodes/revisions/baseNodeRevision.repository.ts";
import { createClaimRevisionRepository } from "../../../src/modules/nodes/revisions/claimRevision.repository.ts";
import { createConceptRevisionRepository } from "../../../src/modules/nodes/revisions/conceptRevision.repository.ts";
import { createNotebookRepository } from "../../../src/modules/notebooks/notebook.repository.ts";
import { createNotebookMemberRepository } from "../../../src/modules/notebooks/notebookMember.repository.ts";
import { createAuthenticatedUser } from "../../test_helpers/auth.ts";

describe("node revision routes", () => {
	const app = buildApp();

	const notebookRepo = createNotebookRepository(db);
	const notebookMemberRepo = createNotebookMemberRepository(db);
	const nodeRepo = createNodeRepository(db);
	const draftRepo = createNodeDraftRepository(db);
	const baseRevisionRepo = createBaseNodeRevisionRepository(db);
	const conceptRevisionRepo = createConceptRevisionRepository(db);
	const claimRevisionRepo = createClaimRevisionRepository(db);

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

	async function createRevision(
		nodeId: string,
		revisionNumber: number,
		content: PublishableNodeContent,
	) {
		const baseRevision = await baseRevisionRepo.create({
			nodeId,
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

		return baseRevision;
	}

	async function createDraft(nodeId: string, content: PublishableNodeContent) {
		const document = createDocumentFromRevision(content);
		try {
			return await draftRepo.create({
				nodeId,
				yjsState: Buffer.from(encodeDocument(document)),
			});
		} finally {
			document.destroy();
		}
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

	describe("GET /notebooks/:notebookId/nodes/:nodeId/revisions", () => {
		it("returns 200 with revision summaries ordered newest first", async () => {
			const { notebook, cookies } = await createNotebookAndUser("viewer");
			const node = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			const otherNode = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			const revision1 = await createRevision(node.id, 1, { ...conceptContent, title: "Old Title" });
			const revision2 = await createRevision(node.id, 2, conceptContent);
			await createRevision(otherNode.id, 1, conceptContent);

			const response = await app.inject({
				method: "GET",
				url: `/api/notebooks/${notebook.id}/nodes/${node.id}/revisions`,
				cookies,
			});

			expect(response.statusCode).toBe(200);
			const payload = response.json();
			expect(payload).toHaveLength(2);
			for (const revision of payload) {
				expect(NodeRevisionSummarySchema.safeParse(revision).success).toEqual(true);
			}
			expect(payload).toMatchObject([
				{ id: revision2.id, nodeId: node.id, revisionNumber: 2, title: conceptContent.title },
				{ id: revision1.id, nodeId: node.id, revisionNumber: 1, title: "Old Title" },
			]);
		});

		it("returns 200 with an empty array for a draft-only node", async () => {
			const { notebook, cookies } = await createNotebookAndUser("viewer");
			const node = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			await createDraft(node.id, conceptContent);

			const response = await app.inject({
				method: "GET",
				url: `/api/notebooks/${notebook.id}/nodes/${node.id}/revisions`,
				cookies,
			});

			expect(response.statusCode).toBe(200);
			expect(response.json()).toEqual([]);
		});
	});

	describe("GET /notebooks/:notebookId/nodes/:nodeId/revisions/:revisionNumber", () => {
		it("returns 200 with the requested historical concept revision", async () => {
			const { notebook, cookies } = await createNotebookAndUser("viewer");
			const node = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			const oldContent = { ...conceptContent, title: "Old Vector Space" };
			const revision = await createRevision(node.id, 1, oldContent);
			await createRevision(node.id, 2, conceptContent);

			const response = await app.inject({
				method: "GET",
				url: `/api/notebooks/${notebook.id}/nodes/${node.id}/revisions/1`,
				cookies,
			});

			expect(response.statusCode).toBe(200);
			const payload = response.json();
			expect(NodeRevisionSchema.safeParse(payload).success).toEqual(true);
			expect(payload).toMatchObject({
				id: revision.id,
				nodeId: node.id,
				revisionNumber: 1,
				...oldContent,
			});
		});

		it("returns 200 with a claim revision's type-specific fields", async () => {
			const { notebook, cookies } = await createNotebookAndUser("viewer");
			const node = await nodeRepo.create({ notebookId: notebook.id, type: "claim" });
			const revision = await createRevision(node.id, 1, claimContent);

			const response = await app.inject({
				method: "GET",
				url: `/api/notebooks/${notebook.id}/nodes/${node.id}/revisions/1`,
				cookies,
			});

			expect(response.statusCode).toBe(200);
			expect(NodeRevisionSchema.safeParse(response.json()).success).toEqual(true);
			expect(response.json()).toMatchObject({
				id: revision.id,
				revisionNumber: 1,
				...claimContent,
			});
		});

		it("returns 400 for invalid revision numbers", async () => {
			const { notebook, cookies } = await createNotebookAndUser("viewer");
			const node = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			await createRevision(node.id, 1, conceptContent);

			for (const revisionNumber of ["0", "-1", "abc"]) {
				const response = await app.inject({
					method: "GET",
					url: `/api/notebooks/${notebook.id}/nodes/${node.id}/revisions/${revisionNumber}`,
					cookies,
				});

				expect(response.statusCode).toBe(400);
				expect(response.json()).toMatchObject({ code: "VALIDATION_ERROR" });
			}
		});

		it("returns 404 when the requested revision does not exist", async () => {
			const { notebook, cookies } = await createNotebookAndUser("viewer");
			const node = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			await createRevision(node.id, 1, conceptContent);

			const response = await app.inject({
				method: "GET",
				url: `/api/notebooks/${notebook.id}/nodes/${node.id}/revisions/2`,
				cookies,
			});

			expect(response.statusCode).toBe(404);
			expect(response.json()).toMatchObject({ code: "NODE_REVISION_NOT_FOUND" });
		});
	});

	describe("POST /notebooks/:notebookId/nodes/:nodeId/revisions/:revisionNumber/restore", () => {
		it("returns 201 with a Base64 Yjs draft initialized from the selected historical revision", async () => {
			const { notebook, cookies } = await createNotebookAndUser("editor");
			const node = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			const oldContent = { ...conceptContent, title: "Old Vector Space" };
			const revision1 = await createRevision(node.id, 1, oldContent);
			const revision2 = await createRevision(node.id, 2, conceptContent);
			const publicationVersion = (await notebookRepo.findById({ id: notebook.id }))
				?.publicationVersion;

			const response = await app.inject({
				method: "POST",
				url: `/api/notebooks/${notebook.id}/nodes/${node.id}/revisions/1/restore`,
				cookies,
			});

			expect(response.statusCode).toBe(201);
			const payload = response.json();
			expect(NodeDraftSchema.safeParse(payload).success).toEqual(true);
			expect(payload).toMatchObject({ nodeId: node.id, saveVersion: 1 });
			expect(typeof payload.state).toEqual("string");

			const bytes = Buffer.from(payload.state, "base64");
			const document = decodeDocument(bytes);
			try {
				expect(extractDraftContent(document, "concept")).toEqual(oldContent);
			} finally {
				document.destroy();
			}

			const storedDraft = await draftRepo.findByNodeId({ nodeId: node.id });
			expect(storedDraft?.id).toEqual(payload.id);
			expect(storedDraft?.yjsState).toEqual(bytes);
			expect(await baseRevisionRepo.findForNode({ nodeId: node.id })).toEqual([
				revision2,
				revision1,
			]);
			expect((await notebookRepo.findById({ id: notebook.id }))?.publicationVersion).toEqual(
				publicationVersion,
			);
		});

		it("returns 409 without replacing an existing draft", async () => {
			const { notebook, cookies } = await createNotebookAndUser("owner");
			const node = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			const revision = await createRevision(node.id, 1, conceptContent);
			const existingDraft = await createDraft(node.id, {
				...conceptContent,
				title: "Unpublished Edits",
			});

			const response = await app.inject({
				method: "POST",
				url: `/api/notebooks/${notebook.id}/nodes/${node.id}/revisions/1/restore`,
				cookies,
			});

			expect(response.statusCode).toBe(409);
			expect(response.json()).toMatchObject({ code: "NODE_DRAFT_EXISTS" });
			expect(await draftRepo.findByNodeId({ nodeId: node.id })).toEqual(existingDraft);
			expect(await baseRevisionRepo.findForNode({ nodeId: node.id })).toEqual([revision]);
		});

		it("returns 403 when a viewer attempts to restore a revision", async () => {
			const { notebook, cookies } = await createNotebookAndUser("viewer");
			const node = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			await createRevision(node.id, 1, conceptContent);

			const response = await app.inject({
				method: "POST",
				url: `/api/notebooks/${notebook.id}/nodes/${node.id}/revisions/1/restore`,
				cookies,
			});

			expect(response.statusCode).toBe(403);
			expect(response.json()).toMatchObject({ code: "FORBIDDEN" });
			expect(await draftRepo.findByNodeId({ nodeId: node.id })).toBeUndefined();
		});
	});

	it("returns 401 for unauthenticated revision requests", async () => {
		const { notebook } = await createNotebookAndUser();
		const node = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
		await createRevision(node.id, 1, conceptContent);

		for (const route of [
			{ method: "GET", url: `/api/notebooks/${notebook.id}/nodes/${node.id}/revisions` },
			{ method: "GET", url: `/api/notebooks/${notebook.id}/nodes/${node.id}/revisions/1` },
			{ method: "POST", url: `/api/notebooks/${notebook.id}/nodes/${node.id}/revisions/1/restore` },
		] as const) {
			const response = await app.inject(route);

			expect(response.statusCode).toBe(401);
			expect(response.json()).toMatchObject({ code: "UNAUTHORIZED" });
		}
	});

	it("returns 404 for revision requests from users outside the notebook", async () => {
		const { cookies } = await createAuthenticatedUser(app);
		const notebook = await notebookRepo.create({ title: "Other Notebook" });
		const node = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
		await createRevision(node.id, 1, conceptContent);

		for (const route of [
			{ method: "GET", url: `/api/notebooks/${notebook.id}/nodes/${node.id}/revisions` },
			{ method: "GET", url: `/api/notebooks/${notebook.id}/nodes/${node.id}/revisions/1` },
			{ method: "POST", url: `/api/notebooks/${notebook.id}/nodes/${node.id}/revisions/1/restore` },
		] as const) {
			const response = await app.inject({ ...route, cookies });

			expect(response.statusCode).toBe(404);
			expect(response.json()).toMatchObject({ code: "NOTEBOOK_NOT_FOUND" });
		}
		expect(await draftRepo.findByNodeId({ nodeId: node.id })).toBeUndefined();
	});

	it("returns 404 when a revision route references a node in another notebook", async () => {
		const { notebook, cookies } = await createNotebookAndUser("owner");
		const otherNotebook = await notebookRepo.create({ title: "Other Notebook" });
		const otherNode = await nodeRepo.create({ notebookId: otherNotebook.id, type: "claim" });
		await createRevision(otherNode.id, 1, claimContent);

		for (const route of [
			{ method: "GET", url: `/api/notebooks/${notebook.id}/nodes/${otherNode.id}/revisions` },
			{ method: "GET", url: `/api/notebooks/${notebook.id}/nodes/${otherNode.id}/revisions/1` },
			{
				method: "POST",
				url: `/api/notebooks/${notebook.id}/nodes/${otherNode.id}/revisions/1/restore`,
			},
		] as const) {
			const response = await app.inject({ ...route, cookies });

			expect(response.statusCode).toBe(404);
			expect(response.json()).toMatchObject({ code: "NODE_NOT_FOUND" });
		}
		expect(await draftRepo.findByNodeId({ nodeId: otherNode.id })).toBeUndefined();
	});
});
