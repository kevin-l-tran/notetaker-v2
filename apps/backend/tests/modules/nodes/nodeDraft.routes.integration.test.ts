import { NodeDraftSchema, NodeRevisionSchema } from "@notetaker-v2/contracts";
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

describe("node draft routes", () => {
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

	function encodeContent(content: PublishableNodeContent) {
		const document = createDocumentFromRevision(content);
		try {
			return Buffer.from(encodeDocument(document));
		} finally {
			document.destroy();
		}
	}

	function readContent(state: string, type: "concept" | "claim") {
		const document = decodeDocument(Buffer.from(state, "base64"));
		try {
			return extractDraftContent(document, type);
		} finally {
			document.destroy();
		}
	}

	async function createDraft(nodeId: string, content: PublishableNodeContent) {
		return await draftRepo.create({ nodeId, yjsState: encodeContent(content) });
	}

	async function insertNodeWithDraft(notebookId: string, content: PublishableNodeContent) {
		const node = await nodeRepo.create({ notebookId, type: content.type });
		const draft = await createDraft(node.id, content);
		return { node, draft };
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

	describe("GET /notebooks/:notebookId/nodes/:nodeId/draft", () => {
		it("returns 200 with the persisted Base64 Yjs draft", async () => {
			const { notebook, cookies } = await createNotebookAndUser("editor");
			const { node, draft } = await insertNodeWithDraft(notebook.id, conceptContent);

			const response = await app.inject({
				method: "GET",
				url: `/api/notebooks/${notebook.id}/nodes/${node.id}/draft`,
				cookies,
			});

			expect(response.statusCode).toBe(200);
			const payload = response.json();
			expect(NodeDraftSchema.safeParse(payload).success).toEqual(true);
			expect(payload).toMatchObject({ id: draft.id, nodeId: node.id, saveVersion: 1 });
			expect(Buffer.from(payload.state, "base64")).toEqual(draft.yjsState);
			expect(readContent(payload.state, "concept")).toEqual(conceptContent);
		});

		it("returns 404 when the node has no draft", async () => {
			const { notebook, cookies } = await createNotebookAndUser("owner");
			const node = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			await createRevision(node.id, 1, conceptContent);

			const response = await app.inject({
				method: "GET",
				url: `/api/notebooks/${notebook.id}/nodes/${node.id}/draft`,
				cookies,
			});

			expect(response.statusCode).toBe(404);
			expect(response.json()).toMatchObject({ code: "NODE_DRAFT_NOT_FOUND" });
		});
	});

	describe("POST /notebooks/:notebookId/nodes/:nodeId/draft", () => {
		it("returns 201 with a new draft initialized from the latest published revision", async () => {
			const { notebook, cookies } = await createNotebookAndUser("owner");
			const node = await nodeRepo.create({ notebookId: notebook.id, type: "claim" });
			await createRevision(node.id, 1, { ...claimContent, title: "Old Title" });
			const latest = await createRevision(node.id, 2, claimContent);

			const response = await app.inject({
				method: "POST",
				url: `/api/notebooks/${notebook.id}/nodes/${node.id}/draft`,
				cookies,
			});

			expect(response.statusCode).toBe(201);
			const payload = response.json();
			expect(NodeDraftSchema.safeParse(payload).success).toEqual(true);
			expect(payload).toMatchObject({ nodeId: node.id, saveVersion: 1 });
			expect(readContent(payload.state, "claim")).toEqual(claimContent);
			const savedDraft = await draftRepo.findByNodeId({ nodeId: node.id });
			expect(savedDraft?.id).toEqual(payload.id);
			expect(savedDraft?.yjsState).toEqual(Buffer.from(payload.state, "base64"));
			expect(await baseRevisionRepo.findForNode({ nodeId: node.id })).toHaveLength(2);
			expect((await baseRevisionRepo.findLatestForNode({ nodeId: node.id }))?.id).toEqual(
				latest.id,
			);
			expect((await notebookRepo.findById({ id: notebook.id }))?.publicationVersion).toEqual(1);
		});

		it("returns 200 with the existing draft without replacing its content or ID", async () => {
			const { notebook, cookies } = await createNotebookAndUser("editor");
			const node = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			await createRevision(node.id, 1, conceptContent);
			const draftContent = { ...conceptContent, title: "Unpublished Title" };
			const existingDraft = await createDraft(node.id, draftContent);

			const response = await app.inject({
				method: "POST",
				url: `/api/notebooks/${notebook.id}/nodes/${node.id}/draft`,
				cookies,
			});

			expect(response.statusCode).toBe(200);
			const payload = response.json();
			expect(NodeDraftSchema.safeParse(payload).success).toEqual(true);
			expect(payload.id).toEqual(existingDraft.id);
			expect(payload.saveVersion).toEqual(existingDraft.saveVersion);
			expect(readContent(payload.state, "concept")).toEqual(draftContent);
			expect(await draftRepo.findByNodeId({ nodeId: node.id })).toEqual(existingDraft);
		});
	});

	describe("PUT /notebooks/:notebookId/nodes/:nodeId/draft/:draftId", () => {
		it("returns 200 with the saved Yjs state and incremented save version", async () => {
			const { notebook, cookies } = await createNotebookAndUser("editor");
			const { node, draft } = await insertNodeWithDraft(notebook.id, conceptContent);
			const updatedContent = { ...conceptContent, title: "Updated Vector Space" };
			const state = encodeContent(updatedContent);

			const response = await app.inject({
				method: "PUT",
				url: `/api/notebooks/${notebook.id}/nodes/${node.id}/draft/${draft.id}`,
				body: { state: state.toString("base64"), expectedSaveVersion: draft.saveVersion },
				cookies,
			});

			expect(response.statusCode).toBe(200);
			const payload = response.json();
			expect(NodeDraftSchema.safeParse(payload).success).toEqual(true);
			expect(payload).toMatchObject({ id: draft.id, nodeId: node.id, saveVersion: 2 });
			expect(readContent(payload.state, "concept")).toEqual(updatedContent);
			const savedDraft = await draftRepo.findByNodeId({ nodeId: node.id });
			expect(savedDraft?.saveVersion).toEqual(2);
			expect(savedDraft?.yjsState).toEqual(state);
			expect((await notebookRepo.findById({ id: notebook.id }))?.publicationVersion).toEqual(1);
		});

		it("returns 409 when the save version is stale without overwriting the draft", async () => {
			const { notebook, cookies } = await createNotebookAndUser("owner");
			const { node, draft } = await insertNodeWithDraft(notebook.id, conceptContent);
			const savedDraft = await draftRepo.saveIfVersionMatches({
				id: draft.id,
				saveVersion: draft.saveVersion,
				yjsState: encodeContent({ ...conceptContent, title: "Already Saved" }),
			});

			const response = await app.inject({
				method: "PUT",
				url: `/api/notebooks/${notebook.id}/nodes/${node.id}/draft/${draft.id}`,
				body: {
					state: encodeContent({ ...conceptContent, title: "Stale Changes" }).toString("base64"),
					expectedSaveVersion: draft.saveVersion,
				},
				cookies,
			});

			expect(response.statusCode).toBe(409);
			expect(response.json()).toMatchObject({ code: "STALE_NODE_DRAFT" });
			expect(await draftRepo.findByNodeId({ nodeId: node.id })).toEqual(savedDraft);
		});

		it("returns 400 for malformed Base64 without modifying the draft", async () => {
			const { notebook, cookies } = await createNotebookAndUser("owner");
			const { node, draft } = await insertNodeWithDraft(notebook.id, conceptContent);

			const response = await app.inject({
				method: "PUT",
				url: `/api/notebooks/${notebook.id}/nodes/${node.id}/draft/${draft.id}`,
				body: { state: "!not-base64!", expectedSaveVersion: draft.saveVersion },
				cookies,
			});

			expect(response.statusCode).toBe(400);
			expect(response.json().code).toEqual(
				expect.stringMatching(/VALIDATION_ERROR|INVALID_DRAFT_CONTENT/),
			);
			expect(await draftRepo.findByNodeId({ nodeId: node.id })).toEqual(draft);
		});
	});

	describe("POST /notebooks/:notebookId/nodes/:nodeId/draft/:draftId/publish", () => {
		it("returns 201 with the new revision and incremented publication version", async () => {
			const { notebook, cookies } = await createNotebookAndUser("owner");
			const { node, draft } = await insertNodeWithDraft(notebook.id, conceptContent);

			const response = await app.inject({
				method: "POST",
				url: `/api/notebooks/${notebook.id}/nodes/${node.id}/draft/${draft.id}/publish`,
				body: { expectedSaveVersion: draft.saveVersion },
				cookies,
			});

			expect(response.statusCode).toBe(201);
			const payload = response.json();
			expect(NodeRevisionSchema.safeParse(payload.revision).success).toEqual(true);
			expect(payload).toMatchObject({
				publicationVersion: 2,
				revision: { nodeId: node.id, revisionNumber: 1, ...conceptContent },
			});
			expect(await draftRepo.findByNodeId({ nodeId: node.id })).toBeUndefined();
			expect(await baseRevisionRepo.findForNode({ nodeId: node.id })).toHaveLength(1);
			expect((await notebookRepo.findById({ id: notebook.id }))?.publicationVersion).toEqual(2);
		});

		it("returns 409 for a stale save version without publishing the draft", async () => {
			const { notebook, cookies } = await createNotebookAndUser("owner");
			const { node, draft } = await insertNodeWithDraft(notebook.id, conceptContent);
			const savedDraft = await draftRepo.saveIfVersionMatches({
				id: draft.id,
				saveVersion: draft.saveVersion,
				yjsState: encodeContent({ ...conceptContent, title: "New Title" }),
			});

			const response = await app.inject({
				method: "POST",
				url: `/api/notebooks/${notebook.id}/nodes/${node.id}/draft/${draft.id}/publish`,
				body: { expectedSaveVersion: draft.saveVersion },
				cookies,
			});

			expect(response.statusCode).toBe(409);
			expect(response.json()).toMatchObject({ code: "STALE_NODE_DRAFT" });
			expect(await draftRepo.findByNodeId({ nodeId: node.id })).toEqual(savedDraft);
			expect(await baseRevisionRepo.findForNode({ nodeId: node.id })).toEqual([]);
			expect((await notebookRepo.findById({ id: notebook.id }))?.publicationVersion).toEqual(1);
		});
	});

	describe("DELETE /notebooks/:notebookId/nodes/:nodeId/draft/:draftId", () => {
		it("returns 204 and deletes an unpublished node with its draft", async () => {
			const { notebook, cookies } = await createNotebookAndUser("editor");
			const { node, draft } = await insertNodeWithDraft(notebook.id, conceptContent);

			const response = await app.inject({
				method: "DELETE",
				url: `/api/notebooks/${notebook.id}/nodes/${node.id}/draft/${draft.id}`,
				cookies,
			});

			expect(response.statusCode).toBe(204);
			expect(response.body).toEqual("");
			expect(
				await nodeRepo.findByIdAndNotebookId({ id: node.id, notebookId: notebook.id }),
			).toBeUndefined();
			expect(await draftRepo.findByNodeId({ nodeId: node.id })).toBeUndefined();
			expect((await notebookRepo.findById({ id: notebook.id }))?.publicationVersion).toEqual(1);
		});

		it("discards a published node's draft without deleting its revision", async () => {
			const { notebook, cookies } = await createNotebookAndUser("owner");
			const node = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			const revision = await createRevision(node.id, 1, conceptContent);
			const draft = await createDraft(node.id, { ...conceptContent, title: "Unpublished Title" });

			const response = await app.inject({
				method: "DELETE",
				url: `/api/notebooks/${notebook.id}/nodes/${node.id}/draft/${draft.id}`,
				cookies,
			});

			expect(response.statusCode).toBe(204);
			expect(
				await nodeRepo.findByIdAndNotebookId({ id: node.id, notebookId: notebook.id }),
			).toEqual(node);
			expect(await draftRepo.findByNodeId({ nodeId: node.id })).toBeUndefined();
			expect(await baseRevisionRepo.findForNode({ nodeId: node.id })).toEqual([revision]);
			expect((await notebookRepo.findById({ id: notebook.id }))?.publicationVersion).toEqual(1);
		});

		it("returns 404 for a stale draft ID without deleting the replacement", async () => {
			const { notebook, cookies } = await createNotebookAndUser("owner");
			const { node, draft } = await insertNodeWithDraft(notebook.id, conceptContent);
			await draftRepo.delete({ id: draft.id });
			const replacement = await createDraft(node.id, { ...conceptContent, title: "Replacement" });

			const response = await app.inject({
				method: "DELETE",
				url: `/api/notebooks/${notebook.id}/nodes/${node.id}/draft/${draft.id}`,
				cookies,
			});

			expect(response.statusCode).toBe(404);
			expect(response.json()).toMatchObject({ code: "NODE_DRAFT_NOT_FOUND" });
			expect(await draftRepo.findByNodeId({ nodeId: node.id })).toEqual(replacement);
			expect(
				await nodeRepo.findByIdAndNotebookId({ id: node.id, notebookId: notebook.id }),
			).toEqual(node);
		});
	});

	it("returns 401 for unauthenticated draft requests", async () => {
		const { notebook } = await createNotebookAndUser();
		const { node, draft } = await insertNodeWithDraft(notebook.id, conceptContent);
		const baseUrl = `/api/notebooks/${notebook.id}/nodes/${node.id}/draft`;

		for (const route of [
			{ method: "GET", url: baseUrl },
			{ method: "POST", url: baseUrl },
			{
				method: "PUT",
				url: `${baseUrl}/${draft.id}`,
				body: { state: draft.yjsState.toString("base64"), expectedSaveVersion: draft.saveVersion },
			},
			{
				method: "POST",
				url: `${baseUrl}/${draft.id}/publish`,
				body: { expectedSaveVersion: draft.saveVersion },
			},
			{ method: "DELETE", url: `${baseUrl}/${draft.id}` },
		] as const) {
			const response = await app.inject(route);

			expect(response.statusCode).toBe(401);
			expect(response.json()).toMatchObject({ code: "UNAUTHORIZED" });
		}
		const savedDraft = await draftRepo.findByNodeId({ nodeId: node.id });
		expect(savedDraft).toEqual(draft);
	});

	it("returns 403 when viewers attempt to access or modify drafts", async () => {
		const { notebook, cookies } = await createNotebookAndUser("viewer");
		const { node, draft } = await insertNodeWithDraft(notebook.id, conceptContent);
		const baseUrl = `/api/notebooks/${notebook.id}/nodes/${node.id}/draft`;

		for (const route of [
			{ method: "GET", url: baseUrl },
			{ method: "POST", url: baseUrl },
			{
				method: "PUT",
				url: `${baseUrl}/${draft.id}`,
				body: { state: draft.yjsState.toString("base64"), expectedSaveVersion: draft.saveVersion },
			},
			{
				method: "POST",
				url: `${baseUrl}/${draft.id}/publish`,
				body: { expectedSaveVersion: draft.saveVersion },
			},
			{ method: "DELETE", url: `${baseUrl}/${draft.id}` },
		] as const) {
			const response = await app.inject({ ...route, cookies });

			expect(response.statusCode).toBe(403);
			expect(response.json()).toMatchObject({ code: "FORBIDDEN" });
		}
		expect(await draftRepo.findByNodeId({ nodeId: node.id })).toEqual(draft);
		expect(await baseRevisionRepo.findForNode({ nodeId: node.id })).toEqual([]);
	});

	it("returns 404 for draft requests from users outside the notebook", async () => {
		const { cookies } = await createAuthenticatedUser(app);
		const notebook = await notebookRepo.create({ title: "Other Notebook" });
		const { node, draft } = await insertNodeWithDraft(notebook.id, conceptContent);
		const baseUrl = `/api/notebooks/${notebook.id}/nodes/${node.id}/draft`;

		for (const route of [
			{ method: "GET", url: baseUrl },
			{ method: "POST", url: baseUrl },
			{
				method: "PUT",
				url: `${baseUrl}/${draft.id}`,
				body: { state: draft.yjsState.toString("base64"), expectedSaveVersion: draft.saveVersion },
			},
			{
				method: "POST",
				url: `${baseUrl}/${draft.id}/publish`,
				body: { expectedSaveVersion: draft.saveVersion },
			},
			{ method: "DELETE", url: `${baseUrl}/${draft.id}` },
		] as const) {
			const response = await app.inject({ ...route, cookies });

			expect(response.statusCode).toBe(404);
			expect(response.json()).toMatchObject({ code: "NOTEBOOK_NOT_FOUND" });
		}
		expect(await draftRepo.findByNodeId({ nodeId: node.id })).toEqual(draft);
		expect(await baseRevisionRepo.findForNode({ nodeId: node.id })).toEqual([]);
	});
});
