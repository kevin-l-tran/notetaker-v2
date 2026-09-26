import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../../src/database/client.ts";
import { notebookMembers } from "../../../src/database/schema/notebookMembers.ts";
import { notebooks } from "../../../src/database/schema/notebooks.ts";
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
						role: "owner",
					}),
					expect.objectContaining({
						id: editableNotebook.id,
						role: "editor",
					}),
					expect.objectContaining({
						id: viewableNotebook.id,
						role: "viewer",
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

				await expect(
					notebookMemberRepo.create({ appUserId: user.id, notebookId: notebook.id, role }),
				).ok;
			}
		});

		it("rejects callers with no membership", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Notebook" });

			await expect(
				service.getNotebook({ appUserId: user.id, notebookId: notebook.id }),
			).rejects.toThrow(new ForbiddenError("Could not find notebook membership."));
		});
	});

	describe("createNotebook", () => {
		it("creates the notebook with the supplied title and description", async () => {
			const user = await userRepo.create();

			const result = await service.createNotebook({
				appUserId: user.id,
				data: { title: "Title", description: "Description" },
			});

			const notebook = await notebookRepo.findById({ id: result.id });

			expect(notebook?.title).toEqual("Title");
			expect(notebook?.description).toEqual("Description");
			expect(result.role).toEqual("owner");
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

			expect(result.title).toEqual("New Title");
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
					new ForbiddenError("Must be the notebook owner to perform this operation."),
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
					new ForbiddenError("Must be the notebook owner to perform this operation."),
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

	describe("listNotebookMembers", () => {
		it("allows any member to list notebook members", async () => {
			for (const role of ["owner", "editor", "viewer"] as const) {
				const user = await userRepo.create();
				const notebook = await notebookRepo.create({ title: "Title" });
				await notebookMemberRepo.create({
					appUserId: user.id,
					notebookId: notebook.id,
					role,
				});

				await expect(service.listNotebookMembers({ appUserId: user.id, notebookId: notebook.id }))
					.ok;
			}
		});

		it("returns all memberships and the associated users for the requested notebook", async () => {
			const owner = await userRepo.create();
			const editor = await userRepo.create();
			const viewer = await userRepo.create();

			const notebook = await notebookRepo.create({ title: "Title" });

			const ownerMemberData = { appUserId: owner.id, role: "owner" as const };
			const editorMemberData = { appUserId: editor.id, role: "editor" as const };
			const viewerMemberData = { appUserId: viewer.id, role: "viewer" as const };

			await notebookMemberRepo.create({
				notebookId: notebook.id,
				...ownerMemberData,
			});
			await notebookMemberRepo.create({
				notebookId: notebook.id,
				...editorMemberData,
			});
			await notebookMemberRepo.create({
				notebookId: notebook.id,
				...viewerMemberData,
			});

			const result = await service.listNotebookMembers({
				appUserId: owner.id,
				notebookId: notebook.id,
			});

			const listData = result.map((v) => {
				return {
					appUserId: v.app_users.id,
					role: v.notebook_members.role,
				};
			});

			expect(listData).toEqual([ownerMemberData, editorMemberData, viewerMemberData]);
		});

		it("doesn't allow non-members to list notebook members", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			await expect(
				service.listNotebookMembers({ appUserId: user.id, notebookId: notebook.id }),
			).rejects.toThrow(new ForbiddenError("Could not find notebook membership."));
		});

		it("does not return memberships from other notebooks", async () => {
			const userA = await userRepo.create();
			const userB = await userRepo.create();

			const notebookA = await notebookRepo.create({ title: "Title A" });
			const notebookB = await notebookRepo.create({ title: "Title B" });

			await notebookMemberRepo.create({
				appUserId: userA.id,
				notebookId: notebookA.id,
				role: "owner",
			});
			await notebookMemberRepo.create({
				appUserId: userB.id,
				notebookId: notebookB.id,
				role: "owner",
			});

			const result = await service.listNotebookMembers({
				appUserId: userA.id,
				notebookId: notebookA.id,
			});

			expect(result.length).toEqual(1);
			expect(result[0]?.app_users.id).toEqual(userA.id);
		});
	});

	describe("addNotebookMember", () => {
		it("allows owners to add a notebook editor");
		it("allows owners to add a notebook viewer");
		it("doesn't allow non-owners to add a notebook editor");
		it("doesn't allow non-owners to add a notebook viewer");
		it("doesn't allow creating an owner membership");
		it("doesn't allow creating a membership for a nonexistent user");
		it("doesn't allow creating a membership for the same user twice");
		it("doesn't create memberships for other notebooks");
	});

	describe("updateNotebookMemberRole", () => {
		it('allows owners to change a member\'s role to "editor"');
		it('allows owners to change a member\'s role to "viewer"');
		it("doesn't allow owners to change a member's role to \"owner\"");
		it("doesn't allow owners to change their own role");
		it("doesn't allow non-owners to change another member's role");
		it("doesn't allow owners to change members from other notebooks");
		it("doesn't allow owners to change nonexistent memberships");
	});

	describe("removeNotebookMember", () => {
		it("allows owners to remove an editor");
		it("allows owners to remove a viewer");
		it("doesn't allow non-members to remove other members");
		it("doesn't allow owners to remove nonexistent members");
		it("doesn't allow owners to remove members from other notebooks");
		it("only removes the member being targeted");
	});

	describe("leaveNotebook", () => {
		it("allows viewers to leave");
		it("allows editors to leave");
		it("doesn't allow owners to leave");
		it("doesn't allow non-members to leave");
		it("only affects the caller's membership");
		it("doesn't affect the caller's membership in other notebooks");
	});

	describe("transferNotebookOwnership", () => {
		it("allows owners to transfer membership to an editor");
		it("allows owners to transfer membership to a viewer");
		it('sets the role of the old owner to "editor"');
		it('sets the role of the targeted member to "owner"');
		it("ensures that exactly one owner remains afterwards");
		it("doesn't allow non-owners to transfer ownership");
		it("doesn't allow owners to transfer ownership to themselves");
		it("doesn't allow owners to transfer ownership to members of other notebooks");
	});
});
