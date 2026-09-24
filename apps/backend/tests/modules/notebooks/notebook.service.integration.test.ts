import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../../src/database/client.ts";
import { appUsers } from "../../../src/database/schema/appUsers.ts";
import { notebookMembers } from "../../../src/database/schema/notebookMembers.ts";
import { notebooks } from "../../../src/database/schema/notebooks.ts";
import { createNotebookService } from "../../../src/modules/notebooks/notebook.service.ts";
import { createServiceContext } from "../../../src/shared/services/serviceContext.ts";

describe("notebook service", () => {
	const service = createNotebookService(createServiceContext(db));

	beforeEach(async () => {
		await db.transaction(async (tx) => {
			await tx.delete(notebookMembers);
			await tx.delete(notebooks);
		});
	});

	async function createUser(displayName: string) {
		const [user] = await db.insert(appUsers).values({ displayName }).returning();

		if (!user) throw new Error("Failed to create test user.");

		return user;
	}

	async function createNotebook(title: string) {
		const [notebook] = await db.insert(notebooks).values({ title }).returning();

		if (!notebook) throw new Error("Failed to create test notebook.");

		return notebook;
	}

	async function createNotebookMembership(
		userId: string,
		notebookId: string,
		role: "owner" | "editor" | "viewer",
	) {
		const [membership] = await db
			.insert(notebookMembers)
			.values({ appUserId: userId, notebookId, role })
			.returning();

		if (!membership) throw new Error("Failed to create test membership.");

		return membership;
	}

	describe("listNotebooksForUser", () => {
		it("returns all notebooks the user is a member of", async () => {
			const user = await createUser("User");
			const owner = await createUser("Owner");

			const notebookA = await createNotebook("Notebook A");
			const notebookB = await createNotebook("Notebook B");

			await db.insert(notebookMembers).values([
				{
					appUserId: user.id,
					notebookId: notebookA.id,
					role: "owner",
				},
				{
					appUserId: owner.id,
					notebookId: notebookB.id,
					role: "owner",
				},
				{
					appUserId: user.id,
					notebookId: notebookB.id,
					role: "editor",
				},
			]);

			const result = await service.listNotebooksForUser({
				appUserId: user.id,
			});

			expect(result).toHaveLength(2);
			expect(result.map((notebook) => notebook.id)).toEqual(
				expect.arrayContaining([notebookA.id, notebookB.id]),
			);
		});

		it("does not return notebooks the user is not a member of", async () => {
			const user = await createUser("User");
			const otherUser = await createUser("Other User");

			const accessibleNotebook = await createNotebook("Accessible");
			const inaccessibleNotebook = await createNotebook("Inaccessible");

			await db.insert(notebookMembers).values([
				{
					appUserId: user.id,
					notebookId: accessibleNotebook.id,
					role: "owner",
				},
				{
					appUserId: otherUser.id,
					notebookId: inaccessibleNotebook.id,
					role: "owner",
				},
			]);

			const result = await service.listNotebooksForUser({
				appUserId: user.id,
			});

			expect(result).toHaveLength(1);
			expect(result[0]?.id).toBe(accessibleNotebook.id);
		});

		it("includes the user's role for each notebook", async () => {
			const user = await createUser("User");
			const owner = await createUser("Owner");

			const ownedNotebook = await createNotebook("Owned");
			const editableNotebook = await createNotebook("Editable");
			const viewableNotebook = await createNotebook("Viewable");

			await db.insert(notebookMembers).values([
				{
					appUserId: user.id,
					notebookId: ownedNotebook.id,
					role: "owner",
				},
				{
					appUserId: owner.id,
					notebookId: editableNotebook.id,
					role: "owner",
				},
				{
					appUserId: user.id,
					notebookId: editableNotebook.id,
					role: "editor",
				},
				{
					appUserId: owner.id,
					notebookId: viewableNotebook.id,
					role: "owner",
				},
				{
					appUserId: user.id,
					notebookId: viewableNotebook.id,
					role: "viewer",
				},
			]);

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
			const user = await createUser("User");
			const otherUser = await createUser("Other User");
			const notebook = await createNotebook("Notebook");

			await db.insert(notebookMembers).values({
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
				const user = await createUser("User");
				const notebook = await createNotebook("Notebook");

				await createNotebookMembership(user.id, notebook.id, role);

				const result = await service.getNotebook({ appUserId: user.id, notebookId: notebook.id });

				expect(result).toEqual({ ...notebook, role });
			}
		});

		it("returns the notebook and the caller's role when the caller is a member");
		it("rejects callers with no membership");
	});

	describe("createNotebook", () => {
		it("creates the notebook with the supplied title and description");
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
