import {
	createDocumentFromRevision,
	createEmptyNodeDocument,
	decodeDocument,
	encodeDocument,
	extractDraftContent,
	type PublishableNodeContent,
} from "@notetaker-v2/node_document";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../../src/database/client.ts";
import { notebookMembers } from "../../../src/database/schema/notebookMembers.ts";
import { notebooks } from "../../../src/database/schema/notebooks.ts";
import { createNodeDraftRepository } from "../../../src/modules/nodes/drafts/nodeDraft.repository.ts";
import { createNodeDraftService } from "../../../src/modules/nodes/drafts/nodeDraft.service.ts";
import { createNodeRepository } from "../../../src/modules/nodes/node.repository.ts";
import { createBaseNodeRevisionRepository } from "../../../src/modules/nodes/revisions/baseNodeRevision.repository.ts";
import { createClaimRevisionRepository } from "../../../src/modules/nodes/revisions/claimRevision.repository.ts";
import { createConceptRevisionRepository } from "../../../src/modules/nodes/revisions/conceptRevision.repository.ts";
import { createNodeRevisionRepository } from "../../../src/modules/nodes/revisions/nodeRevision.repository.ts";
import { createNotebookRepository } from "../../../src/modules/notebooks/notebook.repository.ts";
import { createNotebookMemberRepository } from "../../../src/modules/notebooks/notebookMember.repository.ts";
import { createUserRepository } from "../../../src/modules/users/user.repository.ts";
import {
	BadRequestError,
	ConflictError,
	ForbiddenError,
	NotFoundError,
} from "../../../src/shared/errors/appError.ts";
import { createServiceContext } from "../../../src/shared/services/serviceContext.ts";

describe("node draft service", () => {
	const service = createNodeDraftService(createServiceContext(db));

	const userRepo = createUserRepository(db);
	const notebookRepo = createNotebookRepository(db);
	const notebookMemberRepo = createNotebookMemberRepository(db);
	const nodeRepo = createNodeRepository(db);
	const draftRepo = createNodeDraftRepository(db);
	const baseRevisionRepo = createBaseNodeRevisionRepository(db);
	const conceptRevisionRepo = createConceptRevisionRepository(db);
	const claimRevisionRepo = createClaimRevisionRepository(db);
	const revisionRepo = createNodeRevisionRepository(db);

	const conceptContent = {
		type: "concept",
		title: "Concept Title",
		aliases: [{ text: "Concept Alias", mode: "manual" }],
		excludedAliases: [],
		descriptionSource: "Concept Description",
	} satisfies PublishableNodeContent;

	const claimContent = {
		type: "claim",
		title: "Claim Title",
		aliases: [{ text: "Claim Alias", mode: "auto" }],
		excludedAliases: [],
		predicateSource: "Predicate",
		resultSource: "Result",
		justificationSource: "Justification",
	} satisfies PublishableNodeContent;

	async function createNotebookAndUser(role: "owner" | "editor" | "viewer" | "none") {
		const user = await userRepo.create();
		const notebook = await notebookRepo.create({ title: "Notebook" });
		if (role !== "none") {
			await notebookMemberRepo.create({ appUserId: user.id, notebookId: notebook.id, role });
		}
		return { user, notebook };
	}

	function readYjsContent(yjsState: Uint8Array, type: "concept" | "claim") {
		const document = decodeDocument(yjsState);
		try {
			return extractDraftContent(document, type);
		} finally {
			document.destroy();
		}
	}

	function encodeContent(content: PublishableNodeContent) {
		const document = createDocumentFromRevision(content);
		try {
			return Buffer.from(encodeDocument(document));
		} finally {
			document.destroy();
		}
	}

	async function createRevision(
		nodeId: string,
		revisionNumber: number,
		content: PublishableNodeContent,
	) {
		const revision = await baseRevisionRepo.create({
			nodeId,
			revisionNumber,
			title: content.title,
			aliases: content.aliases,
			excludedAliases: content.excludedAliases,
		});

		if (content.type === "concept") {
			await conceptRevisionRepo.create({
				baseNodeRevisionId: revision.id,
				descriptionSource: content.descriptionSource,
			});
		} else {
			await claimRevisionRepo.create({
				baseNodeRevisionId: revision.id,
				predicateSource: content.predicateSource,
				resultSource: content.resultSource,
				justificationSource: content.justificationSource,
			});
		}

		return revision;
	}

	async function insertNodeWithDraft(notebookId: string, content: PublishableNodeContent) {
		const node = await nodeRepo.create({ notebookId, type: content.type });
		const draft = await draftRepo.create({ nodeId: node.id, yjsState: encodeContent(content) });
		return { node, draft };
	}

	beforeEach(async () => {
		await db.transaction(async (tx) => {
			await tx.delete(notebookMembers);
			await tx.delete(notebooks);
		});
	});

	describe("getDraft", () => {
		it("allows owners and editors to retrieve the persisted Yjs draft", async () => {
			for (const role of ["owner", "editor"] as const) {
				const { user, notebook } = await createNotebookAndUser(role);
				const { node, draft } = await insertNodeWithDraft(notebook.id, conceptContent);

				const result = await service.getDraft({
					appUserId: user.id,
					notebookId: notebook.id,
					nodeId: node.id,
				});

				expect(result).toEqual(draft);

				expect(readYjsContent(result.yjsState, "concept")).toEqual(conceptContent);
			}
		});

		it("rejects viewers and non-members", async () => {
			for (const role of ["viewer", "none"] as const) {
				const { user, notebook } = await createNotebookAndUser(role);
				const { node } = await insertNodeWithDraft(notebook.id, conceptContent);

				await expect(
					service.getDraft({ appUserId: user.id, notebookId: notebook.id, nodeId: node.id }),
				).rejects.toThrow(
					role === "none"
						? new NotFoundError("NOTEBOOK_NOT_FOUND", "Could not find target notebook.")
						: new ForbiddenError("Must have editor permissions to perform this operation."),
				);
			}
		});

		it("returns NOT_FOUND when the node has no draft", async () => {
			const { user, notebook } = await createNotebookAndUser("owner");
			const node = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			await createRevision(node.id, 1, conceptContent);

			await expect(
				service.getDraft({ appUserId: user.id, notebookId: notebook.id, nodeId: node.id }),
			).rejects.toThrow(new NotFoundError("NODE_DRAFT_NOT_FOUND", "Could not find node draft."));
		});
	});

	describe("createDraft", () => {
		it("initializes a draft from the latest published revision, preserving all type-specific content and link metadata", async () => {
			const { user, notebook } = await createNotebookAndUser("owner");
			const concept = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			const claim = await nodeRepo.create({ notebookId: notebook.id, type: "claim" });
			const oldContent = { ...conceptContent, title: "Old Title" };
			const latestConcept = {
				...conceptContent,
				aliases: [{ text: "Latest Alias", mode: "auto" as const }],
				excludedAliases: [{ nodeId: claim.id, text: "Excluded Alias" }],
			};
			const latestClaim = {
				...claimContent,
				excludedAliases: [{ nodeId: concept.id }],
			};
			await createRevision(concept.id, 1, oldContent);
			await createRevision(concept.id, 2, latestConcept);
			await createRevision(claim.id, 1, latestClaim);

			const conceptDraft = await service.createDraft({
				appUserId: user.id,
				notebookId: notebook.id,
				nodeId: concept.id,
			});
			const claimDraft = await service.createDraft({
				appUserId: user.id,
				notebookId: notebook.id,
				nodeId: claim.id,
			});

			expect(readYjsContent(conceptDraft.yjsState, "concept")).toEqual(latestConcept);
			expect(readYjsContent(claimDraft.yjsState, "claim")).toEqual(latestClaim);
			expect(conceptDraft.saveVersion).toEqual(1);
			expect(claimDraft.saveVersion).toEqual(1);
			expect(await draftRepo.findByNodeId({ nodeId: concept.id })).toEqual(conceptDraft);
			expect(await draftRepo.findByNodeId({ nodeId: claim.id })).toEqual(claimDraft);
		});

		it("returns an existing draft without replacing its content or ID", async () => {
			const { user, notebook } = await createNotebookAndUser("owner");
			const node = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			await createRevision(node.id, 1, conceptContent);
			const existingDraft = await draftRepo.create({
				nodeId: node.id,
				yjsState: encodeContent({ ...conceptContent, title: "Draft Changes" }),
			});

			const result = await service.createDraft({
				appUserId: user.id,
				notebookId: notebook.id,
				nodeId: node.id,
			});

			expect(result).toEqual(existingDraft);
			expect(await draftRepo.findByNodeId({ nodeId: node.id })).toEqual(existingDraft);
		});

		it("rejects viewers and non-members", async () => {
			for (const role of ["viewer", "none"] as const) {
				const { user, notebook } = await createNotebookAndUser(role);
				const node = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
				await createRevision(node.id, 1, conceptContent);

				await expect(
					service.createDraft({ appUserId: user.id, notebookId: notebook.id, nodeId: node.id }),
				).rejects.toThrow(
					role === "none"
						? new NotFoundError("NOTEBOOK_NOT_FOUND", "Could not find target notebook.")
						: new ForbiddenError("Must have editor permissions to perform this operation."),
				);
				expect(await draftRepo.findByNodeId({ nodeId: node.id })).toBeUndefined();
			}
		});
	});

	describe("saveDraft", () => {
		it("persists valid Yjs changes and increments the save version", async () => {
			const { user, notebook } = await createNotebookAndUser("editor");
			const { node, draft } = await insertNodeWithDraft(notebook.id, conceptContent);
			const updatedContent = { ...conceptContent, title: "Edited Title" };
			const yjsState = encodeContent(updatedContent);

			const result = await service.saveDraft({
				appUserId: user.id,
				notebookId: notebook.id,
				nodeId: node.id,
				draftId: draft.id,
				expectedSaveVersion: draft.saveVersion,
				yjsState,
			});

			expect(result.saveVersion).toEqual(2);
			expect(result.yjsState).toEqual(yjsState);
			expect(await draftRepo.findByNodeId({ nodeId: node.id })).toEqual(result);

			expect(readYjsContent(result.yjsState, "concept")).toEqual(updatedContent);
		});

		it("rejects an outdated save version without overwriting the current draft", async () => {
			const { user, notebook } = await createNotebookAndUser("owner");
			const { node, draft } = await insertNodeWithDraft(notebook.id, conceptContent);
			const saveInput = {
				appUserId: user.id,
				notebookId: notebook.id,
				nodeId: node.id,
				draftId: draft.id,
				expectedSaveVersion: draft.saveVersion,
			};
			const savedDraft = await service.saveDraft({
				...saveInput,
				yjsState: encodeContent({ ...conceptContent, title: "Saved Title" }),
			});

			await expect(
				service.saveDraft({
					...saveInput,
					yjsState: encodeContent({ ...conceptContent, title: "Stale Title" }),
				}),
			).rejects.toThrow(new ConflictError("STALE_NODE_DRAFT", "Node draft to save is stale."));

			expect(await draftRepo.findByNodeId({ nodeId: node.id })).toEqual(savedDraft);
		});

		it("rejects a stale draft ID without modifying the replacement draft", async () => {
			const { user, notebook } = await createNotebookAndUser("owner");
			const { node, draft: originalDraft } = await insertNodeWithDraft(notebook.id, conceptContent);
			await draftRepo.delete({ id: originalDraft.id });
			const replacementDraft = await draftRepo.create({
				nodeId: node.id,
				yjsState: encodeContent({ ...conceptContent, title: "Replacement" }),
			});

			await expect(
				service.saveDraft({
					appUserId: user.id,
					notebookId: notebook.id,
					nodeId: node.id,
					draftId: originalDraft.id,
					expectedSaveVersion: replacementDraft.saveVersion,
					yjsState: encodeContent({ ...conceptContent, title: "Stale Changes" }),
				}),
			).rejects.toThrow(new NotFoundError("NODE_DRAFT_NOT_FOUND", "Could not find draft to save."));

			expect(await draftRepo.findByNodeId({ nodeId: node.id })).toEqual(replacementDraft);
		});

		it("rejects malformed or wrong-node-type Yjs state without changing the stored draft", async () => {
			const { user, notebook } = await createNotebookAndUser("owner");
			const { node, draft } = await insertNodeWithDraft(notebook.id, conceptContent);

			const saveInput = {
				appUserId: user.id,
				notebookId: notebook.id,
				nodeId: node.id,
				draftId: draft.id,
				expectedSaveVersion: draft.saveVersion,
			};
			await expect(
				service.saveDraft({ ...saveInput, yjsState: Buffer.from([0, 1, 2]) }),
			).rejects.toThrow(
				new BadRequestError("INVALID_DRAFT_CONTENT", "Could not decode draft content."),
			);

			await expect(
				service.saveDraft({ ...saveInput, yjsState: encodeContent(claimContent) }),
			).rejects.toThrow(
				new BadRequestError("INVALID_DRAFT_CONTENT", "Could not parse draft content."),
			);

			expect(await draftRepo.findByNodeId({ nodeId: node.id })).toEqual(draft);
		});

		it("rejects viewers and non-members", async () => {
			for (const role of ["viewer", "none"] as const) {
				const { user, notebook } = await createNotebookAndUser(role);
				const { node, draft } = await insertNodeWithDraft(notebook.id, conceptContent);

				await expect(
					service.saveDraft({
						appUserId: user.id,
						notebookId: notebook.id,
						nodeId: node.id,
						draftId: draft.id,
						expectedSaveVersion: draft.saveVersion,
						yjsState: encodeContent({ ...conceptContent, title: "Unauthorized" }),
					}),
				).rejects.toThrow(
					role === "none"
						? new NotFoundError("NOTEBOOK_NOT_FOUND", "Could not find target notebook.")
						: new ForbiddenError("Must have editor permissions to perform this operation."),
				);
				expect(await draftRepo.findByNodeId({ nodeId: node.id })).toEqual(draft);
			}
		});
	});

	describe("publishDraft", () => {
		it("publishes a concept draft as revision 1 with the correct content and removes its draft", async () => {
			const { user, notebook } = await createNotebookAndUser("owner");
			const { node, draft } = await insertNodeWithDraft(notebook.id, conceptContent);

			const result = await service.publishDraft({
				appUserId: user.id,
				notebookId: notebook.id,
				nodeId: node.id,
				draftId: draft.id,
				expectedSaveVersion: draft.saveVersion,
			});

			const revision = await revisionRepo.findByNodeIdAndRevisionNumber({
				nodeId: node.id,
				nodeType: node.type,
				revisionNumber: 1,
			});
			expect(result.revision).toEqual(revision);
			expect(result.revision.content).toEqual(conceptContent);
			expect(result.revision.baseRevision.revisionNumber).toEqual(1);
			expect(await draftRepo.findByNodeId({ nodeId: node.id })).toBeUndefined();
			expect(
				await nodeRepo.findByIdAndNotebookId({ id: node.id, notebookId: notebook.id }),
			).toEqual(node);
		});

		it("publishes a claim draft with its predicate, result, and justification fields", async () => {
			const { user, notebook } = await createNotebookAndUser("editor");
			const { node, draft } = await insertNodeWithDraft(notebook.id, claimContent);

			const result = await service.publishDraft({
				appUserId: user.id,
				notebookId: notebook.id,
				nodeId: node.id,
				draftId: draft.id,
				expectedSaveVersion: draft.saveVersion,
			});

			expect(result.revision.content).toEqual(claimContent);
			expect(
				await claimRevisionRepo.findByRevisionId({
					baseNodeRevisionId: result.revision.baseRevision.id,
				}),
			).toMatchObject({
				predicateSource: "Predicate",
				resultSource: "Result",
				justificationSource: "Justification",
			});
			expect(await draftRepo.findByNodeId({ nodeId: node.id })).toBeUndefined();
		});

		it("creates the next immutable revision without modifying previous revisions", async () => {
			const { user, notebook } = await createNotebookAndUser("owner");
			const node = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			const previousRevision = await createRevision(node.id, 1, conceptContent);
			const updatedContent = {
				...conceptContent,
				title: "New Title",
				descriptionSource: "New Description",
			};
			const draft = await draftRepo.create({
				nodeId: node.id,
				yjsState: encodeContent(updatedContent),
			});

			const result = await service.publishDraft({
				appUserId: user.id,
				notebookId: notebook.id,
				nodeId: node.id,
				draftId: draft.id,
				expectedSaveVersion: draft.saveVersion,
			});

			const revisions = await baseRevisionRepo.findForNode({ nodeId: node.id });
			const original = await revisionRepo.findByNodeIdAndRevisionNumber({
				nodeId: node.id,
				nodeType: node.type,
				revisionNumber: 1,
			});
			expect(revisions).toHaveLength(2);
			expect(revisions[0]?.revisionNumber).toEqual(2);
			expect(revisions[1]).toEqual(previousRevision);
			expect(original?.content).toEqual(conceptContent);
			expect(result.revision.content).toEqual(updatedContent);
		});

		it("increments the notebook publication version exactly once and returns the new revision and version", async () => {
			const { user, notebook } = await createNotebookAndUser("owner");
			const { node, draft } = await insertNodeWithDraft(notebook.id, conceptContent);

			const result = await service.publishDraft({
				appUserId: user.id,
				notebookId: notebook.id,
				nodeId: node.id,
				draftId: draft.id,
				expectedSaveVersion: draft.saveVersion,
			});

			const updatedNotebook = await notebookRepo.findById({ id: notebook.id });
			expect(result.publicationVersion).toEqual(2);
			expect(updatedNotebook?.publicationVersion).toEqual(2);
			expect(result.revision.baseRevision.nodeId).toEqual(node.id);
			expect(result.revision.baseRevision.revisionNumber).toEqual(1);
		});

		it("rejects a stale draft ID or save version without publishing or deleting the current draft", async () => {
			const { user, notebook } = await createNotebookAndUser("owner");
			const { node, draft: oldDraft } = await insertNodeWithDraft(notebook.id, conceptContent);
			await draftRepo.delete({ id: oldDraft.id });
			const replacementDraft = await draftRepo.create({
				nodeId: node.id,
				yjsState: encodeContent(conceptContent),
			});

			await expect(
				service.publishDraft({
					appUserId: user.id,
					notebookId: notebook.id,
					nodeId: node.id,
					draftId: oldDraft.id,
					expectedSaveVersion: replacementDraft.saveVersion,
				}),
			).rejects.toThrow(new NotFoundError("NODE_DRAFT_NOT_FOUND", "Could not find draft to save."));

			const savedDraft = await draftRepo.saveIfVersionMatches({
				id: replacementDraft.id,
				saveVersion: replacementDraft.saveVersion,
				yjsState: replacementDraft.yjsState,
			});

			await expect(
				service.publishDraft({
					appUserId: user.id,
					notebookId: notebook.id,
					nodeId: node.id,
					draftId: replacementDraft.id,
					expectedSaveVersion: replacementDraft.saveVersion,
				}),
			).rejects.toThrow(new ConflictError("STALE_NODE_DRAFT", "Node draft to save is stale."));

			expect(await draftRepo.findByNodeId({ nodeId: node.id })).toEqual(savedDraft);
			expect(await baseRevisionRepo.findForNode({ nodeId: node.id })).toEqual([]);
			expect((await notebookRepo.findById({ id: notebook.id }))?.publicationVersion).toEqual(1);
		});

		it("rejects unpublishable content without creating a revision or bumping the notebook version", async () => {
			const { user, notebook } = await createNotebookAndUser("owner");
			const node = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			const document = createEmptyNodeDocument("concept");
			const draft = await draftRepo.create({
				nodeId: node.id,
				yjsState: Buffer.from(encodeDocument(document)),
			});
			document.destroy();

			await expect(
				service.publishDraft({
					appUserId: user.id,
					notebookId: notebook.id,
					nodeId: node.id,
					draftId: draft.id,
					expectedSaveVersion: draft.saveVersion,
				}),
			).rejects.toThrow(
				new BadRequestError("INVALID_PUBLISHABLE_CONTENT", "Draft content is not publishable."),
			);

			expect(await baseRevisionRepo.findForNode({ nodeId: node.id })).toEqual([]);
			expect(await draftRepo.findByNodeId({ nodeId: node.id })).toEqual(draft);
			expect((await notebookRepo.findById({ id: notebook.id }))?.publicationVersion).toEqual(1);
		});

		it("rejects viewers and non-members without changing persisted data", async () => {
			for (const role of ["viewer", "none"] as const) {
				const { user, notebook } = await createNotebookAndUser(role);
				const { node, draft } = await insertNodeWithDraft(notebook.id, conceptContent);

				await expect(
					service.publishDraft({
						appUserId: user.id,
						notebookId: notebook.id,
						nodeId: node.id,
						draftId: draft.id,
						expectedSaveVersion: draft.saveVersion,
					}),
				).rejects.toThrow(
					role === "none"
						? new NotFoundError("NOTEBOOK_NOT_FOUND", "Could not find target notebook.")
						: new ForbiddenError("Must have editor permissions to perform this operation."),
				);

				expect(await draftRepo.findByNodeId({ nodeId: node.id })).toEqual(draft);
				expect(await baseRevisionRepo.findForNode({ nodeId: node.id })).toEqual([]);
				expect((await notebookRepo.findById({ id: notebook.id }))?.publicationVersion).toEqual(1);
			}
		});

		it("allows only one of two concurrent publications of the same draft to succeed", async () => {
			const { user, notebook } = await createNotebookAndUser("owner");
			const { node, draft } = await insertNodeWithDraft(notebook.id, conceptContent);
			const input = {
				appUserId: user.id,
				notebookId: notebook.id,
				nodeId: node.id,
				draftId: draft.id,
				expectedSaveVersion: draft.saveVersion,
			};

			const results = await Promise.allSettled([
				service.publishDraft(input),
				service.publishDraft(input),
			]);

			expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
			expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);
			const rejected = results.find((result) => result.status === "rejected");
			if (rejected?.status === "rejected") expect(rejected.reason).toBeInstanceOf(NotFoundError);
			expect(await baseRevisionRepo.findForNode({ nodeId: node.id })).toHaveLength(1);
			expect(await draftRepo.findByNodeId({ nodeId: node.id })).toBeUndefined();
			expect((await notebookRepo.findById({ id: notebook.id }))?.publicationVersion).toEqual(2);
		});

		it("does not lose a concurrently acknowledged draft save during publication", async () => {
			const { user, notebook } = await createNotebookAndUser("owner");
			const { node, draft } = await insertNodeWithDraft(notebook.id, conceptContent);
			const updatedContent = { ...conceptContent, title: "Acknowledged Save" };
			const input = {
				appUserId: user.id,
				notebookId: notebook.id,
				nodeId: node.id,
				draftId: draft.id,
				expectedSaveVersion: draft.saveVersion,
			};

			const [save, publish] = await Promise.allSettled([
				service.saveDraft({ ...input, yjsState: encodeContent(updatedContent) }),
				service.publishDraft(input),
			]);

			expect([save, publish].filter((result) => result.status === "fulfilled")).toHaveLength(1);
			const revisions = await baseRevisionRepo.findForNode({ nodeId: node.id });
			const storedDraft = await draftRepo.findByNodeId({ nodeId: node.id });
			const updatedNotebook = await notebookRepo.findById({ id: notebook.id });

			if (save.status === "fulfilled") {
				if (publish.status === "rejected") expect(publish.reason).toBeInstanceOf(ConflictError);
				expect(revisions).toEqual([]);
				expect.assert(storedDraft);
				expect(storedDraft).toEqual(save.value);

				expect(readYjsContent(storedDraft.yjsState, "concept")).toEqual(updatedContent);
				expect(updatedNotebook?.publicationVersion).toEqual(1);
			} else {
				expect(save.reason instanceof NotFoundError || save.reason instanceof ConflictError).toBe(
					true,
				);
				expect(publish.status).toEqual("fulfilled");
				expect(revisions).toHaveLength(1);
				expect(storedDraft).toBeUndefined();
				const published = await revisionRepo.findByNodeIdAndRevisionNumber({
					nodeId: node.id,
					nodeType: node.type,
					revisionNumber: 1,
				});
				expect(published?.content).toEqual(conceptContent);
				expect(updatedNotebook?.publicationVersion).toEqual(2);
			}
		});
	});

	describe("discardDraft", () => {
		it("removes an unpublished node and its only draft without bumping the notebook publication version", async () => {
			const { user, notebook } = await createNotebookAndUser("editor");
			const { node, draft } = await insertNodeWithDraft(notebook.id, conceptContent);

			await service.discardDraft({
				appUserId: user.id,
				notebookId: notebook.id,
				nodeId: node.id,
				draftId: draft.id,
			});

			expect(
				await nodeRepo.findByIdAndNotebookId({ id: node.id, notebookId: notebook.id }),
			).toBeUndefined();
			expect(await draftRepo.findByNodeId({ nodeId: node.id })).toBeUndefined();
			expect((await notebookRepo.findById({ id: notebook.id }))?.publicationVersion).toEqual(1);
		});

		it("discards a published node's draft while preserving its latest revision and publication version", async () => {
			const { user, notebook } = await createNotebookAndUser("owner");
			const node = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			const revision = await createRevision(node.id, 1, conceptContent);
			const draft = await draftRepo.create({
				nodeId: node.id,
				yjsState: encodeContent({ ...conceptContent, title: "Unpublished Changes" }),
			});

			await service.discardDraft({
				appUserId: user.id,
				notebookId: notebook.id,
				nodeId: node.id,
				draftId: draft.id,
			});

			expect(
				await nodeRepo.findByIdAndNotebookId({ id: node.id, notebookId: notebook.id }),
			).toEqual(node);
			expect(await draftRepo.findByNodeId({ nodeId: node.id })).toBeUndefined();
			expect(await baseRevisionRepo.findForNode({ nodeId: node.id })).toEqual([revision]);
			expect((await notebookRepo.findById({ id: notebook.id }))?.publicationVersion).toEqual(1);
		});

		it("rejects a stale draft ID without removing the current draft", async () => {
			const { user, notebook } = await createNotebookAndUser("owner");
			const { node, draft: oldDraft } = await insertNodeWithDraft(notebook.id, conceptContent);
			await draftRepo.delete({ id: oldDraft.id });
			const replacementDraft = await draftRepo.create({
				nodeId: node.id,
				yjsState: encodeContent({ ...conceptContent, title: "Replacement" }),
			});

			await expect(
				service.discardDraft({
					appUserId: user.id,
					notebookId: notebook.id,
					nodeId: node.id,
					draftId: oldDraft.id,
				}),
			).rejects.toThrow(
				new NotFoundError("NODE_DRAFT_NOT_FOUND", "Could not find draft to discard."),
			);

			expect(
				await nodeRepo.findByIdAndNotebookId({ id: node.id, notebookId: notebook.id }),
			).toEqual(node);
			expect(await draftRepo.findByNodeId({ nodeId: node.id })).toEqual(replacementDraft);
		});

		it("rejects viewers and non-members", async () => {
			for (const role of ["viewer", "none"] as const) {
				const { user, notebook } = await createNotebookAndUser(role);
				const { node, draft } = await insertNodeWithDraft(notebook.id, conceptContent);

				await expect(
					service.discardDraft({
						appUserId: user.id,
						notebookId: notebook.id,
						nodeId: node.id,
						draftId: draft.id,
					}),
				).rejects.toThrow(
					role === "none"
						? new NotFoundError("NOTEBOOK_NOT_FOUND", "Could not find target notebook.")
						: new ForbiddenError("Must have editor permissions to perform this operation."),
				);

				expect(
					await nodeRepo.findByIdAndNotebookId({ id: node.id, notebookId: notebook.id }),
				).toEqual(node);
				expect(await draftRepo.findByNodeId({ nodeId: node.id })).toEqual(draft);
			}
		});
	});
});
