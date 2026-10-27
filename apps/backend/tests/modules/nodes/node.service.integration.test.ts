import {
	createDocumentFromRevision,
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
import { createNodeRepository } from "../../../src/modules/nodes/node.repository.ts";
import { createNodeService } from "../../../src/modules/nodes/node.service.ts";
import { createBaseNodeRevisionRepository } from "../../../src/modules/nodes/revisions/baseNodeRevision.repository.ts";
import { createClaimRevisionRepository } from "../../../src/modules/nodes/revisions/claimRevision.repository.ts";
import { createConceptRevisionRepository } from "../../../src/modules/nodes/revisions/conceptRevision.repository.ts";
import { createNotebookRepository } from "../../../src/modules/notebooks/notebook.repository.ts";
import { createNotebookMemberRepository } from "../../../src/modules/notebooks/notebookMember.repository.ts";
import { createUserRepository } from "../../../src/modules/users/user.repository.ts";
import { ForbiddenError, NotFoundError } from "../../../src/shared/errors/appError.ts";
import { createServiceContext } from "../../../src/shared/services/serviceContext.ts";

describe("node service", () => {
	const service = createNodeService(createServiceContext(db));

	const userRepo = createUserRepository(db);
	const notebookRepo = createNotebookRepository(db);
	const notebookMemberRepo = createNotebookMemberRepository(db);
	const nodeRepo = createNodeRepository(db);
	const draftRepo = createNodeDraftRepository(db);
	const baseRevisionRepo = createBaseNodeRevisionRepository(db);
	const conceptRevisionRepo = createConceptRevisionRepository(db);
	const claimRevisionRepo = createClaimRevisionRepository(db);

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

	describe("listNodesForNotebook", () => {
		it("allows owners, editors, and viewers to list nodes", async () => {
			for (const role of ["owner", "editor", "viewer"] as const) {
				const { user, notebook } = await createNotebookAndUser(role);
				const { node } = await insertNodeWithDraft(notebook.id, conceptContent);

				const result = await service.listNodesForNotebook({
					appUserId: user.id,
					notebookId: notebook.id,
				});

				expect(result).toEqual({
					nodeContents: [{ node, hasDraft: true, revision: undefined }],
					publicationVersion: 1,
				});
			}
		});

		it("returns draft-only and published nodes with the correct hasDraft and latest revision", async () => {
			const { user, notebook } = await createNotebookAndUser("owner");

			const { node: draftOnly } = await insertNodeWithDraft(notebook.id, conceptContent);

			const published = await nodeRepo.create({ notebookId: notebook.id, type: "claim" });
			await createRevision(published.id, 1, { ...claimContent, title: "Old Title" });
			const latestRevision = await createRevision(published.id, 2, claimContent);

			const publishedWithDraft = await nodeRepo.create({
				notebookId: notebook.id,
				type: "concept",
			});
			const conceptRevision = await createRevision(publishedWithDraft.id, 1, conceptContent);
			await draftRepo.create({
				nodeId: publishedWithDraft.id,
				yjsState: encodeContent({ ...conceptContent, title: "Draft Changes" }),
			});

			const result = await service.listNodesForNotebook({
				appUserId: user.id,
				notebookId: notebook.id,
			});

			expect(result.nodeContents).toHaveLength(3);
			expect(result.nodeContents).toEqual(
				expect.arrayContaining([
					{ node: draftOnly, hasDraft: true, revision: undefined },
					{
						node: published,
						hasDraft: false,
						revision: { baseRevision: latestRevision, content: claimContent },
					},
					{
						node: publishedWithDraft,
						hasDraft: true,
						revision: { baseRevision: conceptRevision, content: conceptContent },
					},
				]),
			);
			expect(result.publicationVersion).toEqual(1);
		});

		it("excludes nodes from other notebooks and returns an empty array when there are none", async () => {
			const { user, notebook } = await createNotebookAndUser("owner");
			const otherNotebook = await notebookRepo.create({ title: "Other Notebook" });

			expect(
				await service.listNodesForNotebook({ appUserId: user.id, notebookId: notebook.id }),
			).toEqual({ nodeContents: [], publicationVersion: 1 });

			await insertNodeWithDraft(otherNotebook.id, conceptContent);
			await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			const { node } = await insertNodeWithDraft(notebook.id, conceptContent);

			const result = await service.listNodesForNotebook({
				appUserId: user.id,
				notebookId: notebook.id,
			});

			expect(result).toEqual({
				nodeContents: [{ node, hasDraft: true, revision: undefined }],
				publicationVersion: 1,
			});
		});

		it("rejects users without notebook membership", async () => {
			const { user, notebook } = await createNotebookAndUser("none");

			await expect(
				service.listNodesForNotebook({ appUserId: user.id, notebookId: notebook.id }),
			).rejects.toThrow(new NotFoundError("NOTEBOOK_NOT_FOUND", "Could not find target notebook."));
		});
	});

	describe("getNode", () => {
		it("returns a draft-only node without a published revision", async () => {
			const { user, notebook } = await createNotebookAndUser("viewer");
			const { node } = await insertNodeWithDraft(notebook.id, conceptContent);

			const result = await service.getNode({
				appUserId: user.id,
				notebookId: notebook.id,
				nodeId: node.id,
			});

			expect(result).toEqual({ node, hasDraft: true, revision: undefined });
		});

		it("returns the latest published revision and whether an active draft exists", async () => {
			const { user, notebook } = await createNotebookAndUser("owner");
			const node = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			await createRevision(node.id, 1, { ...conceptContent, title: "Old Title" });
			const revision = await createRevision(node.id, 2, conceptContent);

			const input = { appUserId: user.id, notebookId: notebook.id, nodeId: node.id };
			expect(await service.getNode(input)).toEqual({
				node,
				hasDraft: false,
				revision: { baseRevision: revision, content: conceptContent },
			});

			await draftRepo.create({ nodeId: node.id, yjsState: encodeContent(conceptContent) });

			expect(await service.getNode(input)).toEqual({
				node,
				hasDraft: true,
				revision: { baseRevision: revision, content: conceptContent },
			});
		});

		it("rejects nonexistent nodes and nodes outside the requested notebook", async () => {
			const { user, notebook } = await createNotebookAndUser("owner");
			const otherNotebook = await notebookRepo.create({ title: "Other Notebook" });
			const otherNode = await nodeRepo.create({ notebookId: otherNotebook.id, type: "concept" });

			await expect(
				service.getNode({
					appUserId: user.id,
					notebookId: notebook.id,
					nodeId: crypto.randomUUID(),
				}),
			).rejects.toThrow(new NotFoundError("NODE_NOT_FOUND", "Could not find node."));

			await expect(
				service.getNode({
					appUserId: user.id,
					notebookId: notebook.id,
					nodeId: otherNode.id,
				}),
			).rejects.toThrow(new NotFoundError("NODE_NOT_FOUND", "Could not find node."));

			const orphanNode = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			await expect(
				service.getNode({
					appUserId: user.id,
					notebookId: notebook.id,
					nodeId: orphanNode.id,
				}),
			).rejects.toThrow(new NotFoundError("NODE_NOT_FOUND", "Could not find node."));
		});

		it("rejects users without notebook membership", async () => {
			const { user, notebook } = await createNotebookAndUser("none");
			const { node } = await insertNodeWithDraft(notebook.id, conceptContent);

			await expect(
				service.getNode({ appUserId: user.id, notebookId: notebook.id, nodeId: node.id }),
			).rejects.toThrow(new NotFoundError("NOTEBOOK_NOT_FOUND", "Could not find target notebook."));
		});
	});

	describe("createNode", () => {
		it("allows owners and editors to create a concept with an initialized Yjs draft", async () => {
			for (const role of ["owner", "editor"] as const) {
				const { user, notebook } = await createNotebookAndUser(role);

				const result = await service.createNode({
					appUserId: user.id,
					notebookId: notebook.id,
					data: { type: "concept", title: "New Concept" },
				});

				expect(result.nodeContent.node).toMatchObject({ notebookId: notebook.id, type: "concept" });
				expect(result.draft.nodeId).toEqual(result.nodeContent.node.id);
				expect(result.draft.saveVersion).toEqual(1);
				expect(result.nodeContent.revision).toBeUndefined();
				expect(
					await nodeRepo.findByIdAndNotebookId({
						id: result.nodeContent.node.id,
						notebookId: notebook.id,
					}),
				).toEqual(result.nodeContent.node);
				expect(await draftRepo.findByNodeId({ nodeId: result.nodeContent.node.id })).toEqual(
					result.draft,
				);

				expect(readYjsContent(result.draft.yjsState, "concept")).toEqual({
					type: "concept",
					title: "New Concept",
					aliases: [],
					excludedAliases: [],
					descriptionSource: "",
				});
			}
		});

		it("creates a claim with its type-specific Yjs fields and no published revision", async () => {
			const { user, notebook } = await createNotebookAndUser("owner");

			const result = await service.createNode({
				appUserId: user.id,
				notebookId: notebook.id,
				data: { type: "claim" },
			});

			expect(readYjsContent(result.draft.yjsState, "claim")).toEqual({
				type: "claim",
				title: "",
				aliases: [],
				excludedAliases: [],
				predicateSource: "",
				resultSource: "",
				justificationSource: "",
			});
			expect(result.nodeContent.node.type).toEqual("claim");
			expect(result.nodeContent.revision).toBeUndefined();
			expect(await baseRevisionRepo.findForNode({ nodeId: result.nodeContent.node.id })).toEqual(
				[],
			);
			expect(await draftRepo.findByNodeId({ nodeId: result.nodeContent.node.id })).toEqual(
				result.draft,
			);
		});

		it("rejects viewers and non-members without creating a node or draft", async () => {
			for (const role of ["viewer", "none"] as const) {
				const { user, notebook } = await createNotebookAndUser(role);

				await expect(
					service.createNode({
						appUserId: user.id,
						notebookId: notebook.id,
						data: { type: "concept", title: "Unauthorized" },
					}),
				).rejects.toThrow(
					role === "none"
						? new NotFoundError("NOTEBOOK_NOT_FOUND", "Could not find target notebook.")
						: new ForbiddenError("Must have editor permissions to perform this operation."),
				);

				expect(await nodeRepo.findForNotebook({ notebookId: notebook.id })).toEqual([]);
				expect(await draftRepo.findForNotebook({ notebookId: notebook.id })).toEqual([]);
			}
		});
	});

	describe("deleteNode", () => {
		it("deletes a draft-only node without changing the notebook publication version", async () => {
			const { user, notebook } = await createNotebookAndUser("editor");
			const created = await service.createNode({
				appUserId: user.id,
				notebookId: notebook.id,
				data: { type: "concept", title: "Draft" },
			});

			const deleted = await service.deleteNode({
				appUserId: user.id,
				notebookId: notebook.id,
				nodeId: created.nodeContent.node.id,
			});

			expect(deleted).toEqual(created.nodeContent.node);
			expect(
				await nodeRepo.findByIdAndNotebookId({
					id: created.nodeContent.node.id,
					notebookId: notebook.id,
				}),
			).toBeUndefined();
			expect(await draftRepo.findByNodeId({ nodeId: created.nodeContent.node.id })).toBeUndefined();
			const updatedNotebook = await notebookRepo.findById({ id: notebook.id });
			expect(updatedNotebook?.publicationVersion).toEqual(notebook.publicationVersion);
		});

		it("deletes a published node, its draft and revision history, and bumps the publication version once", async () => {
			const { user, notebook } = await createNotebookAndUser("owner");
			const node = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			const revision1 = await createRevision(node.id, 1, conceptContent);
			const revision2 = await createRevision(node.id, 2, { ...conceptContent, title: "New Title" });
			await draftRepo.create({ nodeId: node.id, yjsState: encodeContent(conceptContent) });

			const result = await service.deleteNode({
				appUserId: user.id,
				notebookId: notebook.id,
				nodeId: node.id,
			});

			expect(result).toEqual(node);
			expect(
				await nodeRepo.findByIdAndNotebookId({ id: node.id, notebookId: notebook.id }),
			).toBeUndefined();
			expect(await draftRepo.findByNodeId({ nodeId: node.id })).toBeUndefined();
			expect(await baseRevisionRepo.findForNode({ nodeId: node.id })).toEqual([]);
			expect(
				await conceptRevisionRepo.findByRevisionId({ baseNodeRevisionId: revision1.id }),
			).toBeUndefined();
			expect(
				await conceptRevisionRepo.findByRevisionId({ baseNodeRevisionId: revision2.id }),
			).toBeUndefined();
			const updatedNotebook = await notebookRepo.findById({ id: notebook.id });
			expect(updatedNotebook?.publicationVersion).toEqual(notebook.publicationVersion + 1);
		});

		it("does not delete other nodes in the notebook", async () => {
			const { user, notebook } = await createNotebookAndUser("owner");
			const toDelete = await nodeRepo.create({ notebookId: notebook.id, type: "concept" });
			const preserved = await nodeRepo.create({ notebookId: notebook.id, type: "claim" });
			await createRevision(toDelete.id, 1, conceptContent);
			const preservedRevision = await createRevision(preserved.id, 1, claimContent);
			const preservedDraft = await draftRepo.create({
				nodeId: preserved.id,
				yjsState: encodeContent(claimContent),
			});

			await service.deleteNode({
				appUserId: user.id,
				notebookId: notebook.id,
				nodeId: toDelete.id,
			});

			expect(
				await nodeRepo.findByIdAndNotebookId({ id: preserved.id, notebookId: notebook.id }),
			).toEqual(preserved);
			expect(await draftRepo.findByNodeId({ nodeId: preserved.id })).toEqual(preservedDraft);
			expect(await baseRevisionRepo.findForNode({ nodeId: preserved.id })).toEqual([
				preservedRevision,
			]);
		});

		it("rejects viewers, non-members, and nodes outside the requested notebook", async () => {
			for (const role of ["viewer", "none"] as const) {
				const { user, notebook } = await createNotebookAndUser(role);
				const { node, draft } = await insertNodeWithDraft(notebook.id, conceptContent);

				await expect(
					service.deleteNode({ appUserId: user.id, notebookId: notebook.id, nodeId: node.id }),
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

			const { user: owner, notebook } = await createNotebookAndUser("owner");
			const otherNotebook = await notebookRepo.create({ title: "Other Notebook" });
			const { node: otherNode } = await insertNodeWithDraft(otherNotebook.id, conceptContent);

			await expect(
				service.deleteNode({ appUserId: owner.id, notebookId: notebook.id, nodeId: otherNode.id }),
			).rejects.toThrow(new NotFoundError("NODE_NOT_FOUND", "Could not find node."));
			expect(
				await nodeRepo.findByIdAndNotebookId({ id: otherNode.id, notebookId: otherNotebook.id }),
			).toEqual(otherNode);
		});
	});
});
