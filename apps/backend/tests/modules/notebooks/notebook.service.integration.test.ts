import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../../src/database/client.ts";
import { notebookMembers } from "../../../src/database/schema/notebookMembers.ts";
import { notebooks } from "../../../src/database/schema/notebooks.ts";
import type { DatabaseExecutor } from "../../../src/database/types.ts";
import { createNotebookRepository } from "../../../src/modules/notebooks/notebook.repository.ts";
import { createNotebookService } from "../../../src/modules/notebooks/notebook.service.ts";
import { createNotebookMemberRepository } from "../../../src/modules/notebooks/notebookMember.repository.ts";
import { createUserRepository } from "../../../src/modules/users/user.repository.ts";
import { ForbiddenError, NotFoundError } from "../../../src/shared/errors/appError.ts";
import { createServiceContext } from "../../../src/shared/services/serviceContext.ts";

describe("notebook service", () => {
	const service = createNotebookService(createServiceContext(db));

	const userRepo = createUserRepository(db);
	const notebookRepo = createNotebookRepository(db);
	const notebookMemberRepo = createNotebookMemberRepository(db);

	beforeEach(async () => {
		await db.transaction(async (tx) => {
			await tx.delete(notebookMembers);
			await tx.delete(notebooks);
		});
	});

	describe("listNotebooksForUser", () => {
		it("returns all notebooks the user is a member of", async () => {
			const user = await userRepo.create();
			const owner = await userRepo.create();

			const notebookA = await notebookRepo.create({ title: "Notebook A" });
			const notebookB = await notebookRepo.create({ title: "Notebook B" });

			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebookA.id,
				role: "owner",
			});
			await notebookMemberRepo.create({
				appUserId: owner.id,
				notebookId: notebookB.id,
				role: "owner",
			});
			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebookB.id,
				role: "editor",
			});

			const result = await service.listNotebooksForUser({
				appUserId: user.id,
			});

			expect(result).toHaveLength(2);
			expect(result.map((notebook) => notebook.id)).toEqual(
				expect.arrayContaining([notebookA.id, notebookB.id]),
			);
		});

		it("does not return notebooks the user is not a member of", async () => {
			const user = await userRepo.create();
			const otherUser = await userRepo.create();

			const accessibleNotebook = await notebookRepo.create({ title: "Accessible" });
			const inaccessibleNotebook = await notebookRepo.create({ title: "Inaccessible" });

			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: accessibleNotebook.id,
				role: "owner",
			});
			await notebookMemberRepo.create({
				appUserId: otherUser.id,
				notebookId: inaccessibleNotebook.id,
				role: "owner",
			});

			const result = await service.listNotebooksForUser({
				appUserId: user.id,
			});

			expect(result).toHaveLength(1);
			expect(result[0]?.id).toBe(accessibleNotebook.id);
		});

		it("includes the user's role for each notebook", async () => {
			const user = await userRepo.create();
			const owner = await userRepo.create();

			const ownedNotebook = await notebookRepo.create({ title: "Owned" });
			const editableNotebook = await notebookRepo.create({ title: "Editable" });
			const viewableNotebook = await notebookRepo.create({ title: "Viewable" });

			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: ownedNotebook.id,
				role: "owner",
			});
			await notebookMemberRepo.create({
				appUserId: owner.id,
				notebookId: editableNotebook.id,
				role: "owner",
			});
			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: editableNotebook.id,
				role: "editor",
			});
			await notebookMemberRepo.create({
				appUserId: owner.id,
				notebookId: viewableNotebook.id,
				role: "owner",
			});
			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: viewableNotebook.id,
				role: "viewer",
			});

			const result = await service.listNotebooksForUser({
				appUserId: user.id,
			});

			expect(result).toEqual(
				expect.arrayContaining([
					expect.objectContaining({
						id: ownedNotebook.id,
						myRole: "owner",
					}),
					expect.objectContaining({
						id: editableNotebook.id,
						myRole: "editor",
					}),
					expect.objectContaining({
						id: viewableNotebook.id,
						myRole: "viewer",
					}),
				]),
			);
		});

		it("returns an empty array when the user has no notebook memberships", async () => {
			const user = await userRepo.create();
			const otherUser = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Notebook" });

			await notebookMemberRepo.create({
				appUserId: otherUser.id,
				notebookId: notebook.id,
				role: "owner",
			});

			const result = await service.listNotebooksForUser({
				appUserId: user.id,
			});

			expect(result).toEqual([]);
		});
	});

	describe("getNotebook", () => {
		it("allows any member to get the notebook", async () => {
			for (const role of ["owner", "editor", "viewer"] as const) {
				const user = await userRepo.create();
				const notebook = await notebookRepo.create({ title: "Notebook" });

				await notebookMemberRepo.create({ appUserId: user.id, notebookId: notebook.id, role });

				await expect(service.getNotebook({ appUserId: user.id, notebookId: notebook.id })).ok;
			}
		});

		it("rejects with a NOT_FOUND error for callers with no membership", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Notebook" });

			await expect(
				service.getNotebook({ appUserId: user.id, notebookId: notebook.id }),
			).rejects.toThrow(new NotFoundError("NOTEBOOK_NOT_FOUND", "Could not find target notebook."));
		});
	});

	describe("createNotebook", () => {
		it("creates the notebook with the supplied title and description", async () => {
			const user = await userRepo.create();

			const result = await service.createNotebook({
				appUserId: user.id,
				data: { title: "Title", description: "Description" },
			});

			expect(result).toMatchObject({ title: "Title", description: "Description", myRole: "owner" });

			const notebook = await notebookRepo.findById({ id: result.id });

			expect(notebook?.title).toEqual("Title");
			expect(notebook?.description).toEqual("Description");
			expect(result.myRole).toEqual("owner");
		});

		it('creates exactly one member for the creator with the "owner" role', async () => {
			const user = await userRepo.create();

			const result = await service.createNotebook({
				appUserId: user.id,
				data: { title: "Title", description: "Description" },
			});

			const memberships = await notebookMemberRepo.findForNotebookWithUsers({
				notebookId: result.id,
			});

			expect(memberships).toHaveLength(1);
			expect(memberships[0]?.notebook_members.appUserId).toEqual(user.id);
			expect(memberships[0]?.notebook_members.role).toEqual("owner");
		});

		it("rolls back notebook creation if owner membership creation fails", async () => {
			const nonexistentUserId = crypto.randomUUID();

			await expect(
				service.createNotebook({
					appUserId: nonexistentUserId,
					data: { title: "Title", description: "Description" },
				}),
			).rejects.toThrow();

			const dbNotebooks = await db.select().from(notebooks);

			expect(dbNotebooks).toHaveLength(0);
		});
	});

	describe("updateNotebook", () => {
		it("allows the owner to update the title", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title", description: "Description" });
			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebook.id,
				role: "owner",
			});

			const result = await service.updateNotebook({
				appUserId: user.id,
				notebookId: notebook.id,
				data: { title: "New Title" },
			});

			const updatedNotebook = await notebookRepo.findById({ id: result.id });

			expect(updatedNotebook?.title).toEqual("New Title");
		});

		it("allows the owner to update the description", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title", description: "Description" });
			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebook.id,
				role: "owner",
			});

			const result = await service.updateNotebook({
				appUserId: user.id,
				notebookId: notebook.id,
				data: { description: "New description" },
			});

			const updatedNotebook = await notebookRepo.findById({ id: result.id });

			expect(updatedNotebook?.description).toEqual("New description");
		});

		it("allows the owner to update both", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title", description: "Description" });
			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebook.id,
				role: "owner",
			});

			const result = await service.updateNotebook({
				appUserId: user.id,
				notebookId: notebook.id,
				data: { title: "New Title", description: "New description" },
			});

			const updatedNotebook = await notebookRepo.findById({ id: result.id });

			expect(updatedNotebook?.title).toEqual("New Title");
			expect(updatedNotebook?.description).toEqual("New description");
		});

		it("allows the owner to clear the description", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title", description: "Description" });
			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebook.id,
				role: "owner",
			});

			const result = await service.updateNotebook({
				appUserId: user.id,
				notebookId: notebook.id,
				data: { description: null },
			});

			const updatedNotebook = await notebookRepo.findById({ id: result.id });

			expect(updatedNotebook?.description).toBeNull();
		});

		it("preserves fields omitted from the input", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title", description: "Description" });
			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebook.id,
				role: "owner",
			});

			const result = await service.updateNotebook({
				appUserId: user.id,
				notebookId: notebook.id,
				data: { title: "New Title" },
			});

			const updatedNotebook = await notebookRepo.findById({ id: result.id });

			expect(updatedNotebook?.description).toEqual("Description");
		});

		it("returns the updated notebook", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title", description: "Description" });
			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebook.id,
				role: "owner",
			});

			const result = await service.updateNotebook({
				appUserId: user.id,
				notebookId: notebook.id,
				data: { title: "New Title" },
			});

			expect(result).toMatchObject({ id: notebook.id, title: "New Title" });
		});

		it("doesn't allow non-owners to update notebook metadata", async () => {
			for (const role of ["editor", "viewer", "none"] as const) {
				const user = await userRepo.create();
				const notebook = await notebookRepo.create({ title: "Title" });

				if (role !== "none")
					await notebookMemberRepo.create({
						appUserId: user.id,
						notebookId: notebook.id,
						role,
					});

				await expect(
					service.updateNotebook({
						appUserId: user.id,
						notebookId: notebook.id,
						data: { title: "New Title" },
					}),
				).rejects.toThrow(
					role === "none"
						? new NotFoundError("NOTEBOOK_NOT_FOUND", "Could not find target notebook.")
						: new ForbiddenError("Must be the notebook owner to perform this operation."),
				);

				const preservedNotebook = await notebookRepo.findById({ id: notebook.id });
				expect(preservedNotebook?.title).toEqual("Title");
			}
		});

		it("returns a NOT_FOUND error when the notebook doesn't exist", async () => {
			const user = await userRepo.create();
			const nonexistentNotebookId = crypto.randomUUID();

			await expect(
				service.updateNotebook({
					appUserId: user.id,
					notebookId: nonexistentNotebookId,
					data: { title: "New Title" },
				}),
			).rejects.toThrow(new NotFoundError("NOTEBOOK_NOT_FOUND", "Could not find target notebook."));
		});
	});

	describe("deleteNotebook", () => {
		it("allows the owner to delete the notebook", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title", description: "Description" });
			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebook.id,
				role: "owner",
			});

			const result = await service.deleteNotebook({ appUserId: user.id, notebookId: notebook.id });
			expect(result).toMatchObject({ id: notebook.id, title: "Title", description: "Description" });

			const deletedNotebook = await notebookRepo.findById({ id: notebook.id });
			expect(deletedNotebook).toBeUndefined();
		});

		it("doesn't allow non-owners to delete the notebook", async () => {
			for (const role of ["editor", "viewer", "none"] as const) {
				const user = await userRepo.create();
				const notebook = await notebookRepo.create({ title: "Title" });

				if (role !== "none")
					await notebookMemberRepo.create({
						appUserId: user.id,
						notebookId: notebook.id,
						role,
					});

				await expect(
					service.deleteNotebook({ appUserId: user.id, notebookId: notebook.id }),
				).rejects.toThrow(
					role === "none"
						? new NotFoundError("NOTEBOOK_NOT_FOUND", "Could not find target notebook.")
						: new ForbiddenError("Must be the notebook owner to perform this operation."),
				);

				const preservedNotebook = await notebookRepo.findById({ id: notebook.id });
				expect(preservedNotebook).toBeDefined();
			}
		});

		it("cascade deletes all memberships when deleting a notebook", async () => {
			const owner = await userRepo.create();
			const viewer = await userRepo.create();

			const notebook = await notebookRepo.create({ title: "Title" });
			const ownerMembership = await notebookMemberRepo.create({
				appUserId: owner.id,
				notebookId: notebook.id,
				role: "owner",
			});
			const viewerMembership = await notebookMemberRepo.create({
				appUserId: viewer.id,
				notebookId: notebook.id,
				role: "viewer",
			});

			await service.deleteNotebook({ appUserId: owner.id, notebookId: notebook.id });

			const deletedOwnerMembership = await notebookMemberRepo.findById({ id: ownerMembership.id });
			const deletedViewerMembership = await notebookMemberRepo.findById({
				id: viewerMembership.id,
			});

			expect(deletedOwnerMembership).toBeUndefined();
			expect(deletedViewerMembership).toBeUndefined();
		});

		it("doesn't affect other notebooks", async () => {
			const user = await userRepo.create();

			const notebookToDelete = await notebookRepo.create({ title: "To Delete" });
			const notebookToPersist = await notebookRepo.create({ title: "To Persist" });

			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebookToDelete.id,
				role: "owner",
			});

			await service.deleteNotebook({ appUserId: user.id, notebookId: notebookToDelete.id });

			const persistedNotebook = await notebookRepo.findById({ id: notebookToPersist.id });
			expect(persistedNotebook).toBeDefined();
		});

		it("returns a NOT_FOUND error when the notebook doesn't exist", async () => {
			const user = await userRepo.create();
			const nonexistentNotebookId = crypto.randomUUID();

			await expect(
				service.deleteNotebook({
					appUserId: user.id,
					notebookId: nonexistentNotebookId,
				}),
			).rejects.toThrow(new NotFoundError("NOTEBOOK_NOT_FOUND", "Could not find target notebook."));
		});
	});

	describe("concurrency", () => {
		async function runWhileNotebookLocked<T>(
			notebookId: string,
			concurrentOperation: () => Promise<T>,
			whileLocked: (tx: DatabaseExecutor) => Promise<void>,
		) {
			let operation: Promise<T> | undefined;

			await db.transaction(async (tx) => {
				const txNotebookRepo = createNotebookRepository(tx);
				await txNotebookRepo.findByIdForUpdate({ id: notebookId });

				operation = concurrentOperation();

				await whileLocked(tx);
			});

			if (!operation) throw new Error("Concurrent operation did not start.");

			return operation;
		}

		async function transferOwnershipDirectly(
			database: DatabaseExecutor,
			ownerMemberId: string,
			newOwnerMemberId: string,
		) {
			const repo = createNotebookMemberRepository(database);

			await repo.updateRole({
				id: ownerMemberId,
				role: "editor",
			});

			await repo.updateRole({
				id: newOwnerMemberId,
				role: "owner",
			});
		}

		it("rechecks ownership after waiting for the notebook lock before updating notebook metadata", async () => {
			const owner = await userRepo.create();
			const editor = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Original Title" });

			const ownerMembership = await notebookMemberRepo.create({
				appUserId: owner.id,
				notebookId: notebook.id,
				role: "owner",
			});

			const editorMembership = await notebookMemberRepo.create({
				appUserId: editor.id,
				notebookId: notebook.id,
				role: "editor",
			});

			const updatePromise = runWhileNotebookLocked(
				notebook.id,
				() =>
					service.updateNotebook({
						appUserId: owner.id,
						notebookId: notebook.id,
						data: { title: "New Title" },
					}),
				(tx) => transferOwnershipDirectly(tx, ownerMembership.id, editorMembership.id),
			);

			await expect(updatePromise).rejects.toThrow(
				new ForbiddenError("Must be the notebook owner to perform this operation."),
			);

			const preservedNotebook = await notebookRepo.findById({
				id: notebook.id,
			});

			expect(preservedNotebook?.title).toBe("Original Title");
		});

		it("rechecks ownership after waiting for the notebook lock before deleting the notebook", async () => {
			const owner = await userRepo.create();
			const editor = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			const ownerMembership = await notebookMemberRepo.create({
				appUserId: owner.id,
				notebookId: notebook.id,
				role: "owner",
			});

			const editorMembership = await notebookMemberRepo.create({
				appUserId: editor.id,
				notebookId: notebook.id,
				role: "editor",
			});

			const deletePromise = runWhileNotebookLocked(
				notebook.id,
				() =>
					service.deleteNotebook({
						appUserId: owner.id,
						notebookId: notebook.id,
					}),
				(tx) => transferOwnershipDirectly(tx, ownerMembership.id, editorMembership.id),
			);

			await expect(deletePromise).rejects.toThrow(
				new ForbiddenError("Must be the notebook owner to perform this operation."),
			);

			const preservedNotebook = await notebookRepo.findById({
				id: notebook.id,
			});

			expect(preservedNotebook).toBeDefined();
		});
	});
});
