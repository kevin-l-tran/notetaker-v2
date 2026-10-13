import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../../src/database/client.ts";
import { baseNodes } from "../../../src/database/schema/baseNodes.ts";
import { notebookMembers } from "../../../src/database/schema/notebookMembers.ts";
import { notebooks } from "../../../src/database/schema/notebooks.ts";
import { createBaseNodeRepository } from "../../../src/modules/baseNodes/baseNode.repository.ts";
import { createBaseNodeService } from "../../../src/modules/baseNodes/baseNode.service.ts";
import { createNotebookRepository } from "../../../src/modules/notebooks/notebook.repository.ts";
import { createNotebookMemberRepository } from "../../../src/modules/notebooks/notebookMember.repository.ts";
import { createUserRepository } from "../../../src/modules/users/user.repository.ts";
import { ForbiddenError, NotFoundError } from "../../../src/shared/errors/appError.ts";
import { createServiceContext } from "../../../src/shared/services/serviceContext.ts";

describe("base node service", () => {
	const service = createBaseNodeService(createServiceContext(db));
	const baseNodeRepo = createBaseNodeRepository(db);
	const notebookRepo = createNotebookRepository(db);
	const notebookMemberRepo = createNotebookMemberRepository(db);
	const userRepo = createUserRepository(db);

	beforeEach(async () => {
		await db.transaction(async (tx) => {
			await tx.delete(notebookMembers);
			await tx.delete(notebooks);
			await tx.delete(baseNodes);
		});
	});

	describe("listNodesForNotebook", () => {
		it("allows any notebook member to list nodes", async () => {
			for (const role of ["owner", "editor", "viewer"] as const) {
				const user = await userRepo.create();
				const notebook = await notebookRepo.create({ title: "Title" });

				await notebookMemberRepo.create({
					appUserId: user.id,
					notebookId: notebook.id,
					role,
				});

				const node = await baseNodeRepo.create({
					notebookId: notebook.id,
					type: "claim",
					title: "Node",
				});

				const result = await service.listNodesForNotebook({
					appUserId: user.id,
					notebookId: notebook.id,
				});

				expect(result).toEqual([node]);
			}
		});

		it("returns all nodes in the requested notebook, but not nodes in other notebooks", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Notebook" });
			const otherNotebook = await notebookRepo.create({ title: "Other Notebook" });

			for (const notebookId of [notebook.id, otherNotebook.id]) {
				await notebookMemberRepo.create({
					appUserId: user.id,
					notebookId,
					role: "owner",
				});
			}

			const nodeA = await baseNodeRepo.create({
				notebookId: notebook.id,
				type: "claim",
				title: "Node A",
			});
			const nodeB = await baseNodeRepo.create({
				notebookId: notebook.id,
				type: "claim",
				title: "Node B",
			});
			await baseNodeRepo.create({
				notebookId: otherNotebook.id,
				type: "claim",
				title: "Other Node",
			});

			const result = await service.listNodesForNotebook({
				appUserId: user.id,
				notebookId: notebook.id,
			});

			expect(result).toHaveLength(2);
			expect(result).toEqual(expect.arrayContaining([nodeA, nodeB]));
		});

		it("returns an empty array when the notebook has no nodes", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebook.id,
				role: "viewer",
			});

			const result = await service.listNodesForNotebook({
				appUserId: user.id,
				notebookId: notebook.id,
			});

			expect(result).toEqual([]);
		});

		it("doesn't allow non-members to list nodes", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			await baseNodeRepo.create({
				notebookId: notebook.id,
				type: "claim",
				title: "Node",
			});

			await expect(
				service.listNodesForNotebook({ appUserId: user.id, notebookId: notebook.id }),
			).rejects.toThrow(new ForbiddenError("Could not find notebook membership."));
		});
	});

	describe("getNode", () => {
		it("allows any notebook member to get a node", async () => {
			for (const role of ["owner", "editor", "viewer"] as const) {
				const user = await userRepo.create();
				const notebook = await notebookRepo.create({ title: "Title" });

				await notebookMemberRepo.create({
					appUserId: user.id,
					notebookId: notebook.id,
					role,
				});

				const node = await baseNodeRepo.create({
					notebookId: notebook.id,
					type: "claim",
					title: "Node",
				});

				const result = await service.getNode({
					appUserId: user.id,
					notebookId: notebook.id,
					baseNodeId: node.id,
				});

				expect(result).toEqual(node);
			}
		});

		it("returns the requested node rather than another node in the same notebook", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebook.id,
				role: "owner",
			});

			const node = await baseNodeRepo.create({
				notebookId: notebook.id,
				type: "claim",
				title: "Target Node",
			});
			await baseNodeRepo.create({
				notebookId: notebook.id,
				type: "claim",
				title: "Other Node",
			});

			const result = await service.getNode({
				appUserId: user.id,
				notebookId: notebook.id,
				baseNodeId: node.id,
			});

			expect(result).toEqual(node);
		});

		it("doesn't allow non-members to get a node", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });
			const node = await baseNodeRepo.create({
				notebookId: notebook.id,
				type: "claim",
				title: "Node",
			});

			await expect(
				service.getNode({
					appUserId: user.id,
					notebookId: notebook.id,
					baseNodeId: node.id,
				}),
			).rejects.toThrow(new ForbiddenError("Could not find notebook membership."));
		});

		it("doesn't return nodes from outside the targeted notebook", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });
			const otherNotebook = await notebookRepo.create({ title: "Other Title" });

			for (const notebookId of [notebook.id, otherNotebook.id]) {
				await notebookMemberRepo.create({
					appUserId: user.id,
					notebookId,
					role: "owner",
				});
			}

			const node = await baseNodeRepo.create({
				notebookId: otherNotebook.id,
				type: "claim",
				title: "Node",
			});

			await expect(
				service.getNode({
					appUserId: user.id,
					notebookId: notebook.id,
					baseNodeId: node.id,
				}),
			).rejects.toThrow(new NotFoundError("NODE_NOT_FOUND", "Could not find node."));
		});

		it("returns a NOT_FOUND error when the node doesn't exist", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebook.id,
				role: "viewer",
			});

			await expect(
				service.getNode({
					appUserId: user.id,
					notebookId: notebook.id,
					baseNodeId: crypto.randomUUID(),
				}),
			).rejects.toThrow(new NotFoundError("NODE_NOT_FOUND", "Could not find node."));
		});
	});

	describe("deleteNode", () => {
		it("allows owners and editors to delete nodes", async () => {
			for (const role of ["editor", "owner"] as const) {
				const user = await userRepo.create();
				const notebook = await notebookRepo.create({ title: "Title" });

				await notebookMemberRepo.create({
					appUserId: user.id,
					notebookId: notebook.id,
					role,
				});

				const node = await baseNodeRepo.create({
					notebookId: notebook.id,
					type: "claim",
					title: "Node",
				});

				const result = await service.deleteNode({
					appUserId: user.id,
					notebookId: notebook.id,
					baseNodeId: node.id,
				});

				expect(result).toMatchObject({ id: node.id, notebookId: notebook.id });

				const deletedNode = await baseNodeRepo.findById({ id: node.id });
				expect(deletedNode).toBeUndefined();
			}
		});

		it("doesn't allow non-editors to delete a node", async () => {
			for (const role of ["viewer", "none"] as const) {
				const user = await userRepo.create();
				const notebook = await notebookRepo.create({ title: "Title" });

				if (role !== "none")
					await notebookMemberRepo.create({
						appUserId: user.id,
						notebookId: notebook.id,
						role,
					});

				const node = await baseNodeRepo.create({
					notebookId: notebook.id,
					type: "claim",
					title: "Node",
				});

				await expect(
					service.deleteNode({
						appUserId: user.id,
						notebookId: notebook.id,
						baseNodeId: node.id,
					}),
				).rejects.toThrow(
					new ForbiddenError("Must have editor permissions to perform this operation."),
				);

				const preservedNode = await baseNodeRepo.findById({ id: node.id });
				expect(preservedNode).toBeDefined();
			}
		});

		it("doesn't delete other nodes in the same notebook", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebook.id,
				role: "owner",
			});

			const node = await baseNodeRepo.create({
				notebookId: notebook.id,
				type: "claim",
				title: "Node",
			});
			const otherNode = await baseNodeRepo.create({
				notebookId: notebook.id,
				type: "claim",
				title: "Node",
			});

			await service.deleteNode({
				appUserId: user.id,
				notebookId: notebook.id,
				baseNodeId: node.id,
			});

			const preservedNode = await baseNodeRepo.findById({ id: otherNode.id });
			expect(preservedNode).toBeDefined();
		});

		it("doesn't delete nodes from notebooks outside the targeted notebook", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });
			const otherNotebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebook.id,
				role: "owner",
			});

			const node = await baseNodeRepo.create({
				notebookId: otherNotebook.id,
				type: "claim",
				title: "Node",
			});

			await expect(
				service.deleteNode({
					appUserId: user.id,
					notebookId: notebook.id,
					baseNodeId: node.id,
				}),
			).rejects.toThrow(new NotFoundError("NODE_NOT_FOUND", "Could not find node."));
		});
	});
});
