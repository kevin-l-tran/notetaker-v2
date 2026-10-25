import {
	createEmptyNodeDocument,
	decodeDocument,
	encodeDocument,
	extractDraftContent,
} from "@notetaker-v2/node_document";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../../src/database/client.ts";
import { notebookMembers } from "../../../src/database/schema/notebookMembers.ts";
import { notebooks } from "../../../src/database/schema/notebooks.ts";
import { createNodeDraftRepository } from "../../../src/modules/nodes/drafts/nodeDraft.repository.ts";
import { createNodeRepository } from "../../../src/modules/nodes/node.repository.ts";
import { createBaseNodeRevisionRepository } from "../../../src/modules/nodes/revisions/baseNodeRevision.repository.ts";
import { createClaimRevisionRepository } from "../../../src/modules/nodes/revisions/claimRevision.repository.ts";
import { createConceptRevisionRepository } from "../../../src/modules/nodes/revisions/conceptRevision.repository.ts";
import { createNodeRevisionService } from "../../../src/modules/nodes/revisions/nodeRevision.service.ts";
import { createNotebookRepository } from "../../../src/modules/notebooks/notebook.repository.ts";
import { createNotebookMemberRepository } from "../../../src/modules/notebooks/notebookMember.repository.ts";
import { createUserRepository } from "../../../src/modules/users/user.repository.ts";
import {
	ConflictError,
	ForbiddenError,
	NotFoundError,
} from "../../../src/shared/errors/appError.ts";
import { createServiceContext } from "../../../src/shared/services/serviceContext.ts";

describe("node revision service", () => {
	const service = createNodeRevisionService(createServiceContext(db));

	const userRepo = createUserRepository(db);
	const notebookRepo = createNotebookRepository(db);
	const notebookMemberRepo = createNotebookMemberRepository(db);
	const nodeRepo = createNodeRepository(db);
	const draftRepo = createNodeDraftRepository(db);
	const baseRevisionRepo = createBaseNodeRevisionRepository(db);
	const conceptRevisionRepo = createConceptRevisionRepository(db);
	const claimRevisionRepo = createClaimRevisionRepository(db);

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

	async function createConceptRevision(nodeId: string, revisionNumber: number, title = "Title") {
		const revision = await baseRevisionRepo.create({
			nodeId,
			revisionNumber,
			title,
			aliases: [],
			excludedAliases: [],
		});
		await conceptRevisionRepo.create({
			baseNodeRevisionId: revision.id,
			descriptionSource: `Description ${revisionNumber}`,
		});
		return revision;
	}

	async function createClaimRevision(nodeId: string, revisionNumber: number, title = "Claim") {
		const revision = await baseRevisionRepo.create({
			nodeId,
			revisionNumber,
			title,
			aliases: [],
			excludedAliases: [],
		});
		await claimRevisionRepo.create({
			baseNodeRevisionId: revision.id,
			predicateSource: `Predicate ${revisionNumber}`,
			resultSource: `Result ${revisionNumber}`,
			justificationSource: `Justification ${revisionNumber}`,
		});
		return revision;
	}

	beforeEach(async () => {
		await db.transaction(async (tx) => {
			await tx.delete(notebookMembers);
			await tx.delete(notebooks);
		});
	});

	describe("listRevisions", () => {
		it("allows owners, editors, and viewers to list a node's revision history", async () => {
			for (const role of ["owner", "editor", "viewer"] as const) {
				const { user, notebook } = await createNotebookAndUser(role);
				const node = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
				const revision = await createConceptRevision(node.id, 1);

				const result = await service.listRevisions({
					appUserId: user.id,
					notebookId: notebook.id,
					nodeId: node.id,
				});

				expect(result).toEqual([revision]);
			}
		});

		it("returns all and only the requested node's published revisions", async () => {
			const { user, notebook } = await createNotebookAndUser("owner");
			const node = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			const otherNode = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			const revision1 = await createConceptRevision(node.id, 1);
			const revision2 = await createConceptRevision(node.id, 2);
			const revision3 = await createConceptRevision(node.id, 3);
			await createConceptRevision(otherNode.id, 1);

			const result = await service.listRevisions({
				appUserId: user.id,
				notebookId: notebook.id,
				nodeId: node.id,
			});

			expect(result).toEqual([revision3, revision2, revision1]);
		});

		it("returns an empty array for a node that has never been published", async () => {
			const { user, notebook } = await createNotebookAndUser("owner");
			const node = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			const document = createEmptyNodeDocument("concept", "Draft");
			await draftRepo.create({ nodeId: node.id, yjsState: Buffer.from(encodeDocument(document)) });
			document.destroy();

			const result = await service.listRevisions({
				appUserId: user.id,
				notebookId: notebook.id,
				nodeId: node.id,
			});

			expect(result).toEqual([]);
		});

		it("rejects non-members and nodes outside the requested notebook", async () => {
			const { user, notebook } = await createNotebookAndUser("owner");
			const otherNotebook = await notebookRepo.create({ title: "Other Notebook" });
			const node = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			const otherNode = await nodeRepo.create({ notebookId: otherNotebook.id, type: "concept" });
			await createConceptRevision(node.id, 1);
			await createConceptRevision(otherNode.id, 1);

			await expect(
				service.listRevisions({
					appUserId: user.id,
					notebookId: otherNotebook.id,
					nodeId: otherNode.id,
				}),
			).rejects.toThrow(new NotFoundError("NOTEBOOK_NOT_FOUND", "Could not find target notebook."));

			await expect(
				service.listRevisions({
					appUserId: user.id,
					notebookId: notebook.id,
					nodeId: otherNode.id,
				}),
			).rejects.toThrow(new NotFoundError("NODE_NOT_FOUND", "Could not find node."));
		});
	});

	describe("getRevision", () => {
		it("returns the requested historical revision with its type-specific content", async () => {
			const { user, notebook } = await createNotebookAndUser("owner");
			const concept = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			const claim = await nodeRepo.create({ notebookId: notebook.id, type: "claim" });
			const conceptRevision = await createConceptRevision(concept.id, 1, "Old Concept");
			await createConceptRevision(concept.id, 2, "New Concept");
			const claimRevision = await createClaimRevision(claim.id, 1, "Old Claim");
			await createClaimRevision(claim.id, 2, "New Claim");

			const conceptResult = await service.getRevision({
				appUserId: user.id,
				notebookId: notebook.id,
				nodeId: concept.id,
				revisionNumber: 1,
			});
			const claimResult = await service.getRevision({
				appUserId: user.id,
				notebookId: notebook.id,
				nodeId: claim.id,
				revisionNumber: 1,
			});

			expect(conceptResult).toEqual({
				baseRevision: conceptRevision,
				content: {
					type: "concept",
					title: "Old Concept",
					aliases: [],
					excludedAliases: [],
					descriptionSource: "Description 1",
				},
			});
			expect(claimResult).toEqual({
				baseRevision: claimRevision,
				content: {
					type: "claim",
					title: "Old Claim",
					aliases: [],
					excludedAliases: [],
					predicateSource: "Predicate 1",
					resultSource: "Result 1",
					justificationSource: "Justification 1",
				},
			});
		});

		it("returns NOT_FOUND for a nonexistent revision number", async () => {
			const { user, notebook } = await createNotebookAndUser("owner");
			const node = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			await createConceptRevision(node.id, 1);

			await expect(
				service.getRevision({
					appUserId: user.id,
					notebookId: notebook.id,
					nodeId: node.id,
					revisionNumber: 2,
				}),
			).rejects.toThrow(
				new NotFoundError("NODE_REVISION_NOT_FOUND", "Could not find node revision."),
			);
		});

		it("rejects non-members and revisions belonging to another notebook", async () => {
			const { user, notebook } = await createNotebookAndUser("owner");
			const otherNotebook = await notebookRepo.create({ title: "Other Notebook" });
			const node = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			const otherNode = await nodeRepo.create({ notebookId: otherNotebook.id, type: "concept" });
			await createConceptRevision(node.id, 1);
			await createConceptRevision(otherNode.id, 1);

			await expect(
				service.getRevision({
					appUserId: user.id,
					notebookId: otherNotebook.id,
					nodeId: otherNode.id,
					revisionNumber: 1,
				}),
			).rejects.toThrow(new NotFoundError("NOTEBOOK_NOT_FOUND", "Could not find target notebook."));

			await expect(
				service.getRevision({
					appUserId: user.id,
					notebookId: notebook.id,
					nodeId: otherNode.id,
					revisionNumber: 1,
				}),
			).rejects.toThrow(new NotFoundError("NODE_NOT_FOUND", "Could not find node."));
		});
	});

	describe("restoreRevision", () => {
		it("allows owners and editors to restore an older revision into a new Yjs draft", async () => {
			for (const role of ["owner", "editor"] as const) {
				const { user, notebook } = await createNotebookAndUser(role);
				const node = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
				await createConceptRevision(node.id, 1, "Old Title");
				await createConceptRevision(node.id, 2, "New Title");

				const result = await service.restoreRevision({
					appUserId: user.id,
					notebookId: notebook.id,
					nodeId: node.id,
					revisionNumber: 1,
				});
				const savedDraft = await draftRepo.findByNodeId({ nodeId: node.id });

				expect(savedDraft).toEqual(result);
				expect(result.nodeId).toEqual(node.id);
				expect(readYjsContent(result.yjsState, "concept")).toMatchObject({
					title: "Old Title",
					descriptionSource: "Description 1",
				});
			}
		});

		it("restores aliases, excluded aliases, and type-specific source fields from the selected revision", async () => {
			const { user, notebook } = await createNotebookAndUser("owner");
			const concept = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			const claim = await nodeRepo.create({ notebookId: notebook.id, type: "claim" });
			const aliases = [
				{ text: "Primary Alias", mode: "manual" as const },
				{ text: "Other Alias", mode: "auto" as const },
			];
			const excludedAliases = [{ nodeId: claim.id, text: "Excluded Alias" }];
			const conceptRevision = await baseRevisionRepo.create({
				nodeId: concept.id,
				revisionNumber: 1,
				title: "Concept Title",
				aliases,
				excludedAliases,
			});
			await conceptRevisionRepo.create({
				baseNodeRevisionId: conceptRevision.id,
				descriptionSource: "Concept Description",
			});
			const claimRevision = await baseRevisionRepo.create({
				nodeId: claim.id,
				revisionNumber: 1,
				title: "Claim Title",
				aliases,
				excludedAliases: [{ nodeId: concept.id }],
			});
			await claimRevisionRepo.create({
				baseNodeRevisionId: claimRevision.id,
				predicateSource: "Predicate",
				resultSource: "Result",
				justificationSource: "Justification",
			});

			const conceptDraft = await service.restoreRevision({
				appUserId: user.id,
				notebookId: notebook.id,
				nodeId: concept.id,
				revisionNumber: 1,
			});
			const claimDraft = await service.restoreRevision({
				appUserId: user.id,
				notebookId: notebook.id,
				nodeId: claim.id,
				revisionNumber: 1,
			});

			expect(readYjsContent(conceptDraft.yjsState, "concept")).toEqual({
				type: "concept",
				title: "Concept Title",
				aliases,
				excludedAliases,
				descriptionSource: "Concept Description",
			});
			expect(readYjsContent(claimDraft.yjsState, "claim")).toEqual({
				type: "claim",
				title: "Claim Title",
				aliases,
				excludedAliases: [{ nodeId: concept.id }],
				predicateSource: "Predicate",
				resultSource: "Result",
				justificationSource: "Justification",
			});
		});

		it("preserves published revision history and does not bump the notebook publication version", async () => {
			const { user, notebook } = await createNotebookAndUser("owner");
			const node = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			const revision1 = await createConceptRevision(node.id, 1);
			const revision2 = await createConceptRevision(node.id, 2);
			await notebookRepo.incrementPublicationVersion({
				id: notebook.id,
			});

			await service.restoreRevision({
				appUserId: user.id,
				notebookId: notebook.id,
				nodeId: node.id,
				revisionNumber: 1,
			});

			const revisions = await baseRevisionRepo.findForNode({ nodeId: node.id });
			const updatedNotebook = await notebookRepo.findById({ id: notebook.id });
			expect(revisions).toEqual([revision2, revision1]);
			expect(updatedNotebook?.publicationVersion).toEqual(2);
		});

		it("rejects restoration when a draft already exists without replacing that draft", async () => {
			const { user, notebook } = await createNotebookAndUser("owner");
			const node = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			await createConceptRevision(node.id, 1);
			const document = createEmptyNodeDocument("concept", "Unsaved Title");
			const existingDraft = await draftRepo.create({
				nodeId: node.id,
				yjsState: Buffer.from(encodeDocument(document)),
			});
			document.destroy();

			await expect(
				service.restoreRevision({
					appUserId: user.id,
					notebookId: notebook.id,
					nodeId: node.id,
					revisionNumber: 1,
				}),
			).rejects.toThrow(
				new ConflictError(
					"NODE_DRAFT_EXISTS",
					"Discard the existing draft before restoring a revision.",
				),
			);

			const savedDraft = await draftRepo.findByNodeId({ nodeId: node.id });
			expect(savedDraft).toEqual(existingDraft);
		});

		it("returns NOT_FOUND for a nonexistent revision without creating a draft", async () => {
			const { user, notebook } = await createNotebookAndUser("owner");
			const node = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			await createConceptRevision(node.id, 1);

			await expect(
				service.restoreRevision({
					appUserId: user.id,
					notebookId: notebook.id,
					nodeId: node.id,
					revisionNumber: 2,
				}),
			).rejects.toThrow(
				new NotFoundError("NODE_REVISION_NOT_FOUND", "Could not find the requested revision."),
			);

			const draft = await draftRepo.findByNodeId({ nodeId: node.id });
			expect(draft).toBeUndefined();
		});

		it("rejects viewers and non-members without creating a draft", async () => {
			for (const role of ["viewer", "none"] as const) {
				const { user, notebook } = await createNotebookAndUser(role);
				const node = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
				await createConceptRevision(node.id, 1);

				await expect(
					service.restoreRevision({
						appUserId: user.id,
						notebookId: notebook.id,
						nodeId: node.id,
						revisionNumber: 1,
					}),
				).rejects.toThrow(
					role === "none"
						? new NotFoundError("NOTEBOOK_NOT_FOUND", "Could not find target notebook.")
						: new ForbiddenError("Must have editor permissions to perform this operation."),
				);

				const draft = await draftRepo.findByNodeId({ nodeId: node.id });
				expect(draft).toBeUndefined();
			}
		});
	});
});
