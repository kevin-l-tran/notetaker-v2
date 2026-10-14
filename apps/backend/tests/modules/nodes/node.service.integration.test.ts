import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../../src/database/client.ts";
import { baseNodes } from "../../../src/database/schema/baseNodes.ts";
import { notebookMembers } from "../../../src/database/schema/notebookMembers.ts";
import { type Notebook, notebooks } from "../../../src/database/schema/notebooks.ts";
import { createBaseNodeRepository } from "../../../src/modules/nodes/baseNode.repository.ts";
import { createConceptRepository } from "../../../src/modules/nodes/concepts/concept.repository.ts";
import { createNodeService } from "../../../src/modules/nodes/node.service.ts";
import { createNotebookRepository } from "../../../src/modules/notebooks/notebook.repository.ts";
import { createNotebookMemberRepository } from "../../../src/modules/notebooks/notebookMember.repository.ts";
import { createUserRepository } from "../../../src/modules/users/user.repository.ts";
import {
	ForbiddenError,
	InvariantError,
	NotFoundError,
} from "../../../src/shared/errors/appError.ts";
import { createServiceContext } from "../../../src/shared/services/serviceContext.ts";

describe("node service", () => {
	const service = createNodeService(createServiceContext(db));
	const baseNodeRepo = createBaseNodeRepository(db);
	const conceptRepo = createConceptRepository(db);
	const notebookRepo = createNotebookRepository(db);
	const notebookMemberRepo = createNotebookMemberRepository(db);
	const userRepo = createUserRepository(db);

	async function createConceptNode(notebookId: Notebook["id"], title: string) {
		return await db.transaction(async (tx) => {
			const baseNode = await createBaseNodeRepository(tx).create({
				notebookId,
				type: "concept",
				title,
			});
			const extension = await createConceptRepository(tx).create({
				baseNodeId: baseNode.id,
				descriptionSource: `Description of ${title}`,
			});
			return { baseNode, extension };
		});
	}

	beforeEach(async () => {
		await db.transaction(async (tx) => {
			await tx.delete(notebookMembers);
			await tx.delete(notebooks);
			await tx.delete(baseNodes);
		});
	});

	describe("listNodesForNotebook", () => {
		it("allows any notebook member to list complete nodes", async () => {
			for (const role of ["owner", "editor", "viewer"] as const) {
				const user = await userRepo.create();
				const notebook = await notebookRepo.create({ title: "Title" });

				await notebookMemberRepo.create({
					appUserId: user.id,
					notebookId: notebook.id,
					role,
				});

				const node = await createConceptNode(notebook.id, "Node");

				const result = await service.listNodesForNotebook({
					appUserId: user.id,
					notebookId: notebook.id,
				});

				expect(result).toEqual([node]);
			}
		});

		it("returns all complete nodes in the requested notebook, but not other notebooks", async () => {
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

			const nodeA = await createConceptNode(notebook.id, "Node A");
			const nodeB = await createConceptNode(notebook.id, "Node B");
			await createConceptNode(otherNotebook.id, "Other Node");

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
			await createConceptNode(notebook.id, "Node");

			await expect(
				service.listNodesForNotebook({ appUserId: user.id, notebookId: notebook.id }),
			).rejects.toThrow(new NotFoundError("NOTEBOOK_NOT_FOUND", "Could not find target notebook."));
		});

		it("throws an invariant error when a concept extension is missing", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebook.id,
				role: "owner",
			});

			await baseNodeRepo.create({
				notebookId: notebook.id,
				type: "concept",
				title: "Node",
			});

			await expect(
				service.listNodesForNotebook({ appUserId: user.id, notebookId: notebook.id }),
			).rejects.toThrow(
				new InvariantError("Expected base node with concept type to have concept object."),
			);
		});
	});

	describe("getNode", () => {
		it("allows any notebook member to get a complete node", async () => {
			for (const role of ["owner", "editor", "viewer"] as const) {
				const user = await userRepo.create();
				const notebook = await notebookRepo.create({ title: "Title" });

				await notebookMemberRepo.create({
					appUserId: user.id,
					notebookId: notebook.id,
					role,
				});

				const node = await createConceptNode(notebook.id, "Node");

				const result = await service.getNode({
					appUserId: user.id,
					notebookId: notebook.id,
					baseNodeId: node.baseNode.id,
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

			const node = await createConceptNode(notebook.id, "Target Node");
			await createConceptNode(notebook.id, "Other Node");

			const result = await service.getNode({
				appUserId: user.id,
				notebookId: notebook.id,
				baseNodeId: node.baseNode.id,
			});

			expect(result).toEqual(node);
		});

		it("doesn't allow non-members to get a node", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });
			const node = await createConceptNode(notebook.id, "Node");

			await expect(
				service.getNode({
					appUserId: user.id,
					notebookId: notebook.id,
					baseNodeId: node.baseNode.id,
				}),
			).rejects.toThrow(new NotFoundError("NOTEBOOK_NOT_FOUND", "Could not find target notebook."));
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

			const node = await createConceptNode(otherNotebook.id, "Node");

			await expect(
				service.getNode({
					appUserId: user.id,
					notebookId: notebook.id,
					baseNodeId: node.baseNode.id,
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

		it("throws an invariant error when a concept extension is missing", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebook.id,
				role: "viewer",
			});

			const node = await baseNodeRepo.create({
				notebookId: notebook.id,
				type: "concept",
				title: "Node",
			});

			await expect(
				service.getNode({
					appUserId: user.id,
					notebookId: notebook.id,
					baseNodeId: node.id,
				}),
			).rejects.toThrow(
				new InvariantError("Expected base node with concept type to have concept object."),
			);
		});
	});

	describe("createNode", () => {
		it("allows owners and editors to create concepts with their extensions", async () => {
			for (const role of ["owner", "editor"] as const) {
				const user = await userRepo.create();
				const notebook = await notebookRepo.create({ title: "Title" });

				await notebookMemberRepo.create({
					appUserId: user.id,
					notebookId: notebook.id,
					role,
				});

				const result = await service.createNode({
					appUserId: user.id,
					notebookId: notebook.id,
					data: {
						type: "concept",
						title: "Node",
						aliases: ["Other Name"],
						descriptionSource: "Description",
					},
				});

				expect(result.baseNode).toMatchObject({
					notebookId: notebook.id,
					type: "concept",
					title: "Node",
					aliases: ["Other Name"],
				});
				expect(result.extension).toEqual({
					baseNodeId: result.baseNode.id,
					descriptionSource: "Description",
				});
				expect(await baseNodeRepo.findById({ id: result.baseNode.id })).toEqual(result.baseNode);
				expect(await conceptRepo.findByBaseNodeId({ baseNodeId: result.baseNode.id })).toEqual(
					result.extension,
				);
			}
		});

		it("uses default aliases when none are provided", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebook.id,
				role: "owner",
			});

			const result = await service.createNode({
				appUserId: user.id,
				notebookId: notebook.id,
				data: { type: "concept", title: "Node", descriptionSource: "Description" },
			});

			expect(result.baseNode.aliases).toEqual([]);
		});

		it("doesn't allow non-editors to create nodes", async () => {
			for (const role of ["viewer", "none"] as const) {
				const user = await userRepo.create();
				const notebook = await notebookRepo.create({ title: "Title" });

				if (role !== "none")
					await notebookMemberRepo.create({
						appUserId: user.id,
						notebookId: notebook.id,
						role,
					});

				await expect(
					service.createNode({
						appUserId: user.id,
						notebookId: notebook.id,
						data: { type: "concept", title: "Node", descriptionSource: "Description" },
					}),
				).rejects.toThrow(
					role === "none"
						? new NotFoundError("NOTEBOOK_NOT_FOUND", "Could not find target notebook.")
						: new ForbiddenError("Must have editor permissions to perform this operation."),
				);

				expect(await baseNodeRepo.findForNotebook({ notebookId: notebook.id })).toEqual([]);
			}
		});
	});

	describe("updateNode", () => {
		it("allows owners and editors to update shared fields and concept extensions", async () => {
			for (const role of ["owner", "editor"] as const) {
				const user = await userRepo.create();
				const notebook = await notebookRepo.create({ title: "Title" });

				await notebookMemberRepo.create({
					appUserId: user.id,
					notebookId: notebook.id,
					role,
				});

				const node = await createConceptNode(notebook.id, "Node");

				const result = await service.updateNode({
					appUserId: user.id,
					notebookId: notebook.id,
					baseNodeId: node.baseNode.id,
					data: {
						type: "concept",
						title: "Updated Node",
						aliases: ["Other Name"],
						descriptionSource: "Updated Description",
					},
				});

				expect(result.baseNode).toMatchObject({
					id: node.baseNode.id,
					title: "Updated Node",
					aliases: ["Other Name"],
				});
				expect(result.extension).toEqual({
					baseNodeId: node.baseNode.id,
					descriptionSource: "Updated Description",
				});
				expect(await baseNodeRepo.findById({ id: node.baseNode.id })).toEqual(result.baseNode);
				expect(await conceptRepo.findByBaseNodeId({ baseNodeId: node.baseNode.id })).toEqual(
					result.extension,
				);
			}
		});

		it("updates only the title when other fields are omitted", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebook.id,
				role: "owner",
			});

			const node = await createConceptNode(notebook.id, "Node");
			const result = await service.updateNode({
				appUserId: user.id,
				notebookId: notebook.id,
				baseNodeId: node.baseNode.id,
				data: { type: "concept", title: "Updated Node" },
			});

			expect(result.baseNode.title).toBe("Updated Node");
			expect(result.baseNode.aliases).toEqual(node.baseNode.aliases);
			expect(result.extension).toEqual(node.extension);
			expect(await conceptRepo.findByBaseNodeId({ baseNodeId: node.baseNode.id })).toEqual(
				node.extension,
			);
		});

		it("updates only aliases when other fields are omitted", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebook.id,
				role: "owner",
			});

			const node = await createConceptNode(notebook.id, "Node");
			const result = await service.updateNode({
				appUserId: user.id,
				notebookId: notebook.id,
				baseNodeId: node.baseNode.id,
				data: { type: "concept", aliases: ["Other Name"] },
			});

			expect(result.baseNode.title).toBe(node.baseNode.title);
			expect(result.baseNode.aliases).toEqual(["Other Name"]);
			expect(result.extension).toEqual(node.extension);
		});

		it("updates only the concept description and persists the base node timestamp", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebook.id,
				role: "owner",
			});

			const node = await createConceptNode(notebook.id, "Node");
			const result = await service.updateNode({
				appUserId: user.id,
				notebookId: notebook.id,
				baseNodeId: node.baseNode.id,
				data: { type: "concept", descriptionSource: "Updated Description" },
			});

			expect(result.baseNode.title).toBe(node.baseNode.title);
			expect(result.baseNode.aliases).toEqual(node.baseNode.aliases);
			expect(result.baseNode.updatedAt.getTime()).toBeGreaterThanOrEqual(
				node.baseNode.updatedAt.getTime(),
			);
			expect(result.extension.descriptionSource).toBe("Updated Description");
			expect(await baseNodeRepo.findById({ id: node.baseNode.id })).toEqual(result.baseNode);
			expect(await conceptRepo.findByBaseNodeId({ baseNodeId: node.baseNode.id })).toEqual(
				result.extension,
			);
		});

		it("doesn't allow non-editors to update a node", async () => {
			for (const role of ["viewer", "none"] as const) {
				const user = await userRepo.create();
				const notebook = await notebookRepo.create({ title: "Title" });

				if (role !== "none")
					await notebookMemberRepo.create({
						appUserId: user.id,
						notebookId: notebook.id,
						role,
					});

				const node = await createConceptNode(notebook.id, "Node");

				await expect(
					service.updateNode({
						appUserId: user.id,
						notebookId: notebook.id,
						baseNodeId: node.baseNode.id,
						data: { type: "concept", descriptionSource: "Updated Description" },
					}),
				).rejects.toThrow(
					role === "none"
						? new NotFoundError("NOTEBOOK_NOT_FOUND", "Could not find target notebook.")
						: new ForbiddenError("Must have editor permissions to perform this operation."),
				);

				expect(await baseNodeRepo.findById({ id: node.baseNode.id })).toEqual(node.baseNode);
				expect(await conceptRepo.findByBaseNodeId({ baseNodeId: node.baseNode.id })).toEqual(
					node.extension,
				);
			}
		});

		it("doesn't update nodes from notebooks outside the targeted notebook", async () => {
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

			const node = await createConceptNode(otherNotebook.id, "Node");

			await expect(
				service.updateNode({
					appUserId: user.id,
					notebookId: notebook.id,
					baseNodeId: node.baseNode.id,
					data: { type: "concept", title: "Updated Node" },
				}),
			).rejects.toThrow(new NotFoundError("NODE_NOT_FOUND", "Could not find node."));

			expect(await baseNodeRepo.findById({ id: node.baseNode.id })).toEqual(node.baseNode);
			expect(await conceptRepo.findByBaseNodeId({ baseNodeId: node.baseNode.id })).toEqual(
				node.extension,
			);
		});

		it("returns a NOT_FOUND error when the node doesn't exist", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebook.id,
				role: "owner",
			});

			await expect(
				service.updateNode({
					appUserId: user.id,
					notebookId: notebook.id,
					baseNodeId: crypto.randomUUID(),
					data: { type: "concept", title: "Updated Node" },
				}),
			).rejects.toThrow(new NotFoundError("NODE_NOT_FOUND", "Could not find node."));
		});
	});

	describe("deleteNode", () => {
		it("allows owners and editors to delete nodes and their extensions", async () => {
			for (const role of ["editor", "owner"] as const) {
				const user = await userRepo.create();
				const notebook = await notebookRepo.create({ title: "Title" });

				await notebookMemberRepo.create({
					appUserId: user.id,
					notebookId: notebook.id,
					role,
				});

				const node = await createConceptNode(notebook.id, "Node");

				const result = await service.deleteNode({
					appUserId: user.id,
					notebookId: notebook.id,
					baseNodeId: node.baseNode.id,
				});

				expect(result).toMatchObject({ id: node.baseNode.id, notebookId: notebook.id });
				expect(await baseNodeRepo.findById({ id: node.baseNode.id })).toBeUndefined();
				expect(
					await conceptRepo.findByBaseNodeId({ baseNodeId: node.baseNode.id }),
				).toBeUndefined();
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

				const node = await createConceptNode(notebook.id, "Node");

				await expect(
					service.deleteNode({
						appUserId: user.id,
						notebookId: notebook.id,
						baseNodeId: node.baseNode.id,
					}),
				).rejects.toThrow(
					role === "none"
						? new NotFoundError("NOTEBOOK_NOT_FOUND", "Could not find target notebook.")
						: new ForbiddenError("Must have editor permissions to perform this operation."),
				);

				expect(await baseNodeRepo.findById({ id: node.baseNode.id })).toBeDefined();
				expect(await conceptRepo.findByBaseNodeId({ baseNodeId: node.baseNode.id })).toBeDefined();
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

			const node = await createConceptNode(notebook.id, "Node");
			const otherNode = await createConceptNode(notebook.id, "Other Node");

			await service.deleteNode({
				appUserId: user.id,
				notebookId: notebook.id,
				baseNodeId: node.baseNode.id,
			});

			expect(await baseNodeRepo.findById({ id: otherNode.baseNode.id })).toBeDefined();
			expect(
				await conceptRepo.findByBaseNodeId({ baseNodeId: otherNode.baseNode.id }),
			).toBeDefined();
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

			const node = await createConceptNode(otherNotebook.id, "Node");

			await expect(
				service.deleteNode({
					appUserId: user.id,
					notebookId: notebook.id,
					baseNodeId: node.baseNode.id,
				}),
			).rejects.toThrow(new NotFoundError("NODE_NOT_FOUND", "Could not find node."));
		});
	});
});
