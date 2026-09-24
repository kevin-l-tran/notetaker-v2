import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../../src/database/client.ts";
import { notebookMembers } from "../../../src/database/schema/notebookMembers.ts";
import { notebooks } from "../../../src/database/schema/notebooks.ts";
import { createNotebookRepository } from "../../../src/modules/notebooks/notebook.repository.ts";
import { createNotebookService } from "../../../src/modules/notebooks/notebook.service.ts";
import { createNotebookMemberRepository } from "../../../src/modules/notebooks/notebookMember.repository.ts";
import { createUserRepository } from "../../../src/modules/users/user.repository.ts";
import { ForbiddenError } from "../../../src/shared/errors/appError.ts";
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

				await notebookMemberRepo.create({ appUserId: user.id, notebookId: notebook.id, role });

				const result = await service.getNotebook({ appUserId: user.id, notebookId: notebook.id });

				expect(result).toEqual({ ...notebook, role });
			}
		});

		it("rejects callers with no membership", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Notebook" });

			const getNotebook = async () =>
				await service.getNotebook({ appUserId: user.id, notebookId: notebook.id });

			expect(getNotebook).rejects.toThrow(
				new ForbiddenError("Could not find notebook membership."),
			);
		});
	});

	describe("createNotebook", () => {
		it("creates the notebook with the supplied title and description", async () => {
			const user = await userRepo.create();

			const result = await service.createNotebook({
				appUserId: user.id,
				data: { title: "Title", description: "Description" },
			});

			expect(result.title).toEqual("Title");
			expect(result.description).toEqual("Description");
		});
		it('creates exactly one member for the creator with the "owner" role');
		it("it returns the notebook and the caller's role");
		it("rolls back notebook creation if owner membership creation fails");
		it("leaves no orphan notebook after transaction failure");
	});

	describe("updateNotebook", () => {
		it("allows the owner to update the title");
		it("allows the owner to update the description");
		it("allows the owner to update both");
		it("allows the owner to clear the description");
		it("preserves fields omitted from the input");
		it("returns the updated notebook");
		it("doesn't allow non-owners to update notebook metadata");
		it("returns a NOT_FOUND error when the notebook doesn't exist");
	});

	describe("deleteNotebook", () => {
		it("allows the owner to delete the notebook");
		it("doesn't allow non-owners to delete the notebook");
		it("returns the deleted notebook");
		it("cascade deletes all memberships when deleting a notebook");
		it("doesn't affect other notebooks");
		it("returns a NOT_FOUND error when the notebook doesn't exist");
	});

	describe("listNotebookMembers", () => {
		it("allows any member to list notebook members");
		it("doesn't allow non-members to list notebook members");
		it("returns all memberships and the associated users for the requested notebook");
		it("does not return memberships from other notebooks");
	});

	describe("addNotebookMember", () => {
		it("allows owners to add a notebook editor");
		it("allows owners to add a notebook viewer");
		it("doesn't allow non-owners to add a notebook editor");
		it("doesn't allow non-owners to add a notebook viewer");
		it("doesn't allow creating an owner membership");
		it("doesn't allow creating a membership for a nonexistant user");
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
