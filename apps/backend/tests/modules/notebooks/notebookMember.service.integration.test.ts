import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../../src/database/client.ts";
import { notebookMembers } from "../../../src/database/schema/notebookMembers.ts";
import { notebooks } from "../../../src/database/schema/notebooks.ts";
import type { DatabaseExecutor } from "../../../src/database/types.ts";
import { createNotebookRepository } from "../../../src/modules/notebooks/notebook.repository.ts";
import { createNotebookMemberRepository } from "../../../src/modules/notebooks/notebookMember.repository.ts";
import { createNotebookMemberService } from "../../../src/modules/notebooks/notebookMember.service.ts";
import { createUserRepository } from "../../../src/modules/users/user.repository.ts";
import {
	BadRequestError,
	ForbiddenError,
	NotFoundError,
} from "../../../src/shared/errors/appError.ts";
import { createServiceContext } from "../../../src/shared/services/serviceContext.ts";

describe("notebook membership service", () => {
	const service = createNotebookMemberService(createServiceContext(db));

	const userRepo = createUserRepository(db);
	const notebookRepo = createNotebookRepository(db);
	const notebookMemberRepo = createNotebookMemberRepository(db);

	beforeEach(async () => {
		await db.transaction(async (tx) => {
			await tx.delete(notebookMembers);
			await tx.delete(notebooks);
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

	describe("getNotebookMembership", () => {
		it("returns the caller's membership for each role", async () => {
			for (const role of ["owner", "editor", "viewer"] as const) {
				const user = await userRepo.create();
				const notebook = await notebookRepo.create({ title: "Title" });
				const membership = await notebookMemberRepo.create({
					appUserId: user.id,
					notebookId: notebook.id,
					role,
				});

				const result = await service.getNotebookMembership({
					appUserId: user.id,
					notebookId: notebook.id,
				});

				expect(result).toEqual(membership);
			}
		});

		it("returns the caller's membership rather than another member's", async () => {
			const owner = await userRepo.create();
			const viewer = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: owner.id,
				notebookId: notebook.id,
				role: "owner",
			});
			const viewerMembership = await notebookMemberRepo.create({
				appUserId: viewer.id,
				notebookId: notebook.id,
				role: "viewer",
			});

			const result = await service.getNotebookMembership({
				appUserId: viewer.id,
				notebookId: notebook.id,
			});

			expect(result).toEqual(viewerMembership);
		});

		it("returns the membership for the requested notebook", async () => {
			const user = await userRepo.create();
			const notebookA = await notebookRepo.create({ title: "Notebook A" });
			const notebookB = await notebookRepo.create({ title: "Notebook B" });

			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebookA.id,
				role: "owner",
			});
			const membershipB = await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebookB.id,
				role: "editor",
			});

			const result = await service.getNotebookMembership({
				appUserId: user.id,
				notebookId: notebookB.id,
			});

			expect(result).toEqual(membershipB);
		});

		it("rejects callers who are not members of the requested notebook", async () => {
			const owner = await userRepo.create();
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Target" });
			const otherNotebook = await notebookRepo.create({ title: "Other" });

			await notebookMemberRepo.create({
				appUserId: owner.id,
				notebookId: notebook.id,
				role: "owner",
			});
			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: otherNotebook.id,
				role: "owner",
			});

			await expect(
				service.getNotebookMembership({ appUserId: user.id, notebookId: notebook.id }),
			).rejects.toThrow(new ForbiddenError("Could not find notebook membership."));
		});

		it("rejects when the notebook does not exist", async () => {
			const user = await userRepo.create();

			await expect(
				service.getNotebookMembership({ appUserId: user.id, notebookId: crypto.randomUUID() }),
			).rejects.toThrow(new ForbiddenError("Could not find notebook membership."));
		});
	});

	describe("addNotebookMember", () => {
		it("allows owners to add a notebook editor", async () => {
			const owner = await userRepo.create();
			const editor = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: owner.id,
				notebookId: notebook.id,
				role: "owner",
			});

			const result = await service.addNotebookMember({
				appUserId: owner.id,
				notebookId: notebook.id,
				data: {
					targetAppUserId: editor.id,
					role: "editor",
				},
			});

			const newEditor = await notebookMemberRepo.findById({ id: result.id });

			expect(newEditor).toMatchObject({
				appUserId: editor.id,
				notebookId: notebook.id,
				role: "editor",
			});
		});

		it("allows owners to add a notebook viewer", async () => {
			const owner = await userRepo.create();
			const viewer = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: owner.id,
				notebookId: notebook.id,
				role: "owner",
			});

			const result = await service.addNotebookMember({
				appUserId: owner.id,
				notebookId: notebook.id,
				data: {
					targetAppUserId: viewer.id,
					role: "viewer",
				},
			});

			const newViewer = await notebookMemberRepo.findById({ id: result.id });

			expect(newViewer).toMatchObject({
				appUserId: viewer.id,
				notebookId: notebook.id,
				role: "viewer",
			});
		});

		it("returns the newly created membership", async () => {
			const owner = await userRepo.create();
			const viewer = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: owner.id,
				notebookId: notebook.id,
				role: "owner",
			});

			const result = await service.addNotebookMember({
				appUserId: owner.id,
				notebookId: notebook.id,
				data: {
					targetAppUserId: viewer.id,
					role: "viewer",
				},
			});

			expect(result).toMatchObject({
				appUserId: viewer.id,
				notebookId: notebook.id,
				role: "viewer",
			});
		});

		it("doesn't allow non-owners to add a notebook editor", async () => {
			for (const role of ["editor", "viewer", "none"] as const) {
				const userA = await userRepo.create();
				const userB = await userRepo.create();
				const notebook = await notebookRepo.create({ title: "Title" });

				if (role !== "none")
					await notebookMemberRepo.create({
						appUserId: userA.id,
						notebookId: notebook.id,
						role,
					});

				await expect(
					service.addNotebookMember({
						appUserId: userA.id,
						notebookId: notebook.id,
						data: {
							targetAppUserId: userB.id,
							role: "editor",
						},
					}),
				).rejects.toThrow(
					new ForbiddenError("Must be the notebook owner to perform this operation."),
				);
			}
		});

		it("doesn't allow non-owners to add a notebook viewer", async () => {
			for (const role of ["editor", "viewer", "none"] as const) {
				const userA = await userRepo.create();
				const userB = await userRepo.create();
				const notebook = await notebookRepo.create({ title: "Title" });

				if (role !== "none")
					await notebookMemberRepo.create({
						appUserId: userA.id,
						notebookId: notebook.id,
						role,
					});

				await expect(
					service.addNotebookMember({
						appUserId: userA.id,
						notebookId: notebook.id,
						data: {
							targetAppUserId: userB.id,
							role: "viewer",
						},
					}),
				).rejects.toThrow(
					new ForbiddenError("Must be the notebook owner to perform this operation."),
				);
			}
		});

		it("doesn't allow creating an owner membership", async () => {
			const owner = await userRepo.create();
			const targetUser = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: owner.id,
				notebookId: notebook.id,
				role: "owner",
			});

			await expect(
				service.addNotebookMember({
					appUserId: owner.id,
					notebookId: notebook.id,
					data: {
						targetAppUserId: targetUser.id,
						role: "owner",
					},
				}),
			).rejects.toThrow(
				new BadRequestError("INVALID_MEMBERSHIP_ROLE", "Cannot create a new notebook owner."),
			);
		});

		it("doesn't allow creating a membership for a nonexistent user", async () => {
			const user = await userRepo.create();
			const nonexistentTargetId = crypto.randomUUID();
			const notebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebook.id,
				role: "owner",
			});

			await expect(
				service.addNotebookMember({
					appUserId: user.id,
					notebookId: notebook.id,
					data: {
						targetAppUserId: nonexistentTargetId,
						role: "viewer",
					},
				}),
			).rejects.toThrow(new BadRequestError("USER_NOT_FOUND", "Target user was not found."));
		});

		it("doesn't allow creating a membership for the same user twice", async () => {
			const user = await userRepo.create();
			const targetUser = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebook.id,
				role: "owner",
			});
			await notebookMemberRepo.create({
				appUserId: targetUser.id,
				notebookId: notebook.id,
				role: "viewer",
			});

			await expect(
				service.addNotebookMember({
					appUserId: user.id,
					notebookId: notebook.id,
					data: {
						targetAppUserId: targetUser.id,
						role: "editor",
					},
				}),
			).rejects.toThrow(
				new BadRequestError(
					"NOTEBOOK_MEMBERSHIP_ALREADY_EXISTS",
					"The target user already has a membership.",
				),
			);
		});

		it("doesn't create memberships for other notebooks", async () => {
			const owner = await userRepo.create();
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });
			const otherNotebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: owner.id,
				notebookId: notebook.id,
				role: "owner",
			});

			await service.addNotebookMember({
				appUserId: owner.id,
				notebookId: notebook.id,
				data: {
					targetAppUserId: user.id,
					role: "viewer",
				},
			});

			const otherNotebookMembers = await notebookMemberRepo.findForNotebookWithUsers({
				notebookId: otherNotebook.id,
			});

			expect(otherNotebookMembers).toHaveLength(0);
		});
	});

	describe("updateNotebookMemberRole", () => {
		it('allows owners to change a member\'s role to "editor"', async () => {
			const owner = await userRepo.create();
			const viewer = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: owner.id,
				notebookId: notebook.id,
				role: "owner",
			});
			const viewerMembership = await notebookMemberRepo.create({
				appUserId: viewer.id,
				notebookId: notebook.id,
				role: "viewer",
			});

			await service.updateNotebookMemberRole({
				appUserId: owner.id,
				notebookId: notebook.id,
				data: {
					memberId: viewerMembership.id,
					role: "editor",
				},
			});

			const updatedMembership = await notebookMemberRepo.findById({ id: viewerMembership.id });

			expect(updatedMembership?.role).toEqual("editor");
		});

		it('allows owners to change a member\'s role to "viewer"', async () => {
			const owner = await userRepo.create();
			const editor = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: owner.id,
				notebookId: notebook.id,
				role: "owner",
			});
			const editorMembership = await notebookMemberRepo.create({
				appUserId: editor.id,
				notebookId: notebook.id,
				role: "viewer",
			});

			await service.updateNotebookMemberRole({
				appUserId: owner.id,
				notebookId: notebook.id,
				data: {
					memberId: editorMembership.id,
					role: "viewer",
				},
			});

			const updatedMembership = await notebookMemberRepo.findById({ id: editorMembership.id });

			expect(updatedMembership?.role).toEqual("viewer");
		});

		it("returns the updated membership", async () => {
			const owner = await userRepo.create();
			const viewer = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: owner.id,
				notebookId: notebook.id,
				role: "owner",
			});
			const viewerMembership = await notebookMemberRepo.create({
				appUserId: viewer.id,
				notebookId: notebook.id,
				role: "viewer",
			});

			const result = await service.updateNotebookMemberRole({
				appUserId: owner.id,
				notebookId: notebook.id,
				data: {
					memberId: viewerMembership.id,
					role: "editor",
				},
			});

			expect(result).toMatchObject({
				id: viewerMembership.id,
				appUserId: viewer.id,
				notebookId: notebook.id,
				role: "editor",
			});
		});

		it("doesn't allow owners to change a member's role to \"owner\"", async () => {
			const owner = await userRepo.create();
			const viewer = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: owner.id,
				notebookId: notebook.id,
				role: "owner",
			});
			const viewerMembership = await notebookMemberRepo.create({
				appUserId: viewer.id,
				notebookId: notebook.id,
				role: "viewer",
			});

			await expect(
				service.updateNotebookMemberRole({
					appUserId: owner.id,
					notebookId: notebook.id,
					data: {
						memberId: viewerMembership.id,
						role: "owner",
					},
				}),
			).rejects.toThrow(
				new BadRequestError("INVALID_MEMBERSHIP_ROLE", 'Cannot set a member\'s role to "owner".'),
			);
		});

		it("doesn't allow owners to change their own role", async () => {
			const owner = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			const membership = await notebookMemberRepo.create({
				appUserId: owner.id,
				notebookId: notebook.id,
				role: "owner",
			});

			await expect(
				service.updateNotebookMemberRole({
					appUserId: owner.id,
					notebookId: notebook.id,
					data: {
						memberId: membership.id,
						role: "viewer",
					},
				}),
			).rejects.toThrow(new ForbiddenError("You must transfer ownership to change your role."));
		});

		it("doesn't allow non-owners to change another member's role", async () => {
			for (const role of ["editor", "viewer", "none"] as const) {
				const user = await userRepo.create();
				const targetUser = await userRepo.create();
				const notebook = await notebookRepo.create({ title: "Title" });

				if (role !== "none")
					await notebookMemberRepo.create({
						appUserId: user.id,
						notebookId: notebook.id,
						role,
					});

				const targetMembership = await notebookMemberRepo.create({
					appUserId: targetUser.id,
					notebookId: notebook.id,
					role: "viewer",
				});

				await expect(
					service.updateNotebookMemberRole({
						appUserId: user.id,
						notebookId: notebook.id,
						data: {
							memberId: targetMembership.id,
							role: "editor",
						},
					}),
				).rejects.toThrow(
					new ForbiddenError("Must be the notebook owner to perform this operation."),
				);
			}
		});

		it("doesn't allow owners to change members from other notebooks", async () => {
			const owner = await userRepo.create();
			const member = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });
			const otherNotebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: owner.id,
				notebookId: notebook.id,
				role: "owner",
			});

			const otherMembership = await notebookMemberRepo.create({
				appUserId: member.id,
				notebookId: otherNotebook.id,
				role: "viewer",
			});

			await expect(
				service.updateNotebookMemberRole({
					appUserId: owner.id,
					notebookId: otherNotebook.id,
					data: {
						memberId: otherMembership.id,
						role: "editor",
					},
				}),
			).rejects.toThrow(
				new ForbiddenError("Must be the notebook owner to perform this operation."),
			);
		});

		it("doesn't allow owners to change nonexistent memberships", async () => {
			const user = await userRepo.create();
			const nonexistentId = crypto.randomUUID();
			const notebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebook.id,
				role: "owner",
			});

			await expect(
				service.updateNotebookMemberRole({
					appUserId: user.id,
					notebookId: notebook.id,
					data: {
						memberId: nonexistentId,
						role: "viewer",
					},
				}),
			).rejects.toThrow(
				new NotFoundError("NOTEBOOK_MEMBERSHIP_NOT_FOUND", "Could not find notebook membership."),
			);
		});
	});

	describe("removeNotebookMember", () => {
		it("allows owners to remove an editor", async () => {
			const owner = await userRepo.create();
			const editor = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: owner.id,
				notebookId: notebook.id,
				role: "owner",
			});
			const editorMembership = await notebookMemberRepo.create({
				appUserId: editor.id,
				notebookId: notebook.id,
				role: "editor",
			});

			await service.removeNotebookMember({
				appUserId: owner.id,
				notebookId: notebook.id,
				memberId: editorMembership.id,
			});

			const deletedMembership = await notebookMemberRepo.findById({ id: editorMembership.id });

			expect(deletedMembership).toBeUndefined();
		});

		it("allows owners to remove a viewer", async () => {
			const owner = await userRepo.create();
			const viewer = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: owner.id,
				notebookId: notebook.id,
				role: "owner",
			});
			const viewerMembership = await notebookMemberRepo.create({
				appUserId: viewer.id,
				notebookId: notebook.id,
				role: "viewer",
			});

			await service.removeNotebookMember({
				appUserId: owner.id,
				notebookId: notebook.id,
				memberId: viewerMembership.id,
			});

			const deletedMembership = await notebookMemberRepo.findById({ id: viewerMembership.id });

			expect(deletedMembership).toBeUndefined();
		});

		it("returns the deleted membership", async () => {
			const owner = await userRepo.create();
			const editor = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: owner.id,
				notebookId: notebook.id,
				role: "owner",
			});
			const editorMembership = await notebookMemberRepo.create({
				appUserId: editor.id,
				notebookId: notebook.id,
				role: "editor",
			});

			const result = await service.removeNotebookMember({
				appUserId: owner.id,
				notebookId: notebook.id,
				memberId: editorMembership.id,
			});

			expect(result).toMatchObject({
				id: editorMembership.id,
				appUserId: editor.id,
				notebookId: notebook.id,
				role: "editor",
			});
		});

		it("doesn't allow non-members to remove other members", async () => {
			for (const role of ["editor", "viewer", "none"] as const) {
				const user = await userRepo.create();
				const viewer = await userRepo.create();
				const notebook = await notebookRepo.create({ title: "Title" });

				if (role !== "none")
					await notebookMemberRepo.create({
						appUserId: user.id,
						notebookId: notebook.id,
						role,
					});

				const viewerMembership = await notebookMemberRepo.create({
					appUserId: viewer.id,
					notebookId: notebook.id,
					role: "viewer",
				});

				await expect(
					service.removeNotebookMember({
						appUserId: user.id,
						notebookId: notebook.id,
						memberId: viewerMembership.id,
					}),
				).rejects.toThrow(
					new ForbiddenError("Must be the notebook owner to perform this operation."),
				);
			}
		});

		it("doesn't allow owners to remove nonexistent members", async () => {
			const owner = await userRepo.create();
			const nonexistentId = crypto.randomUUID();
			const notebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: owner.id,
				notebookId: notebook.id,
				role: "owner",
			});

			await expect(
				service.removeNotebookMember({
					appUserId: owner.id,
					notebookId: notebook.id,
					memberId: nonexistentId,
				}),
			).rejects.toThrow(
				new NotFoundError("NOTEBOOK_MEMBERSHIP_NOT_FOUND", "Could not find notebook membership."),
			);
		});

		it("doesn't allow owners to remove members from other notebooks", async () => {
			const owner = await userRepo.create();
			const member = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });
			const otherNotebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: owner.id,
				notebookId: notebook.id,
				role: "owner",
			});

			const membership = await notebookMemberRepo.create({
				appUserId: member.id,
				notebookId: otherNotebook.id,
				role: "viewer",
			});

			await expect(
				service.removeNotebookMember({
					appUserId: owner.id,
					notebookId: otherNotebook.id,
					memberId: membership.id,
				}),
			).rejects.toThrow(
				new ForbiddenError("Must be the notebook owner to perform this operation."),
			);
		});

		it("only removes the member being targeted", async () => {
			const owner = await userRepo.create();
			const editor = await userRepo.create();
			const viewer = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: owner.id,
				notebookId: notebook.id,
				role: "owner",
			});
			const editorMembership = await notebookMemberRepo.create({
				appUserId: editor.id,
				notebookId: notebook.id,
				role: "editor",
			});
			const viewerMembership = await notebookMemberRepo.create({
				appUserId: viewer.id,
				notebookId: notebook.id,
				role: "viewer",
			});

			await service.removeNotebookMember({
				appUserId: owner.id,
				notebookId: notebook.id,
				memberId: editorMembership.id,
			});

			const preservedMembership = await notebookMemberRepo.findById({ id: viewerMembership.id });

			expect(preservedMembership).toBeDefined();
		});
	});

	describe("leaveNotebook", () => {
		it("allows viewers to leave", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			const membership = await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebook.id,
				role: "viewer",
			});

			await service.leaveNotebook({ appUserId: user.id, notebookId: notebook.id });

			const deletedMembership = await notebookMemberRepo.findById({ id: membership.id });

			expect(deletedMembership).toBeUndefined();
		});

		it("allows editors to leave", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			const membership = await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebook.id,
				role: "editor",
			});

			await service.leaveNotebook({ appUserId: user.id, notebookId: notebook.id });

			const deletedMembership = await notebookMemberRepo.findById({ id: membership.id });

			expect(deletedMembership).toBeUndefined();
		});

		it("returns caller's prior membership", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			const membership = await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebook.id,
				role: "viewer",
			});

			const result = await service.leaveNotebook({ appUserId: user.id, notebookId: notebook.id });

			expect(result).toEqual(membership);
		});

		it("doesn't allow owners to leave", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebook.id,
				role: "owner",
			});

			await expect(
				service.leaveNotebook({ appUserId: user.id, notebookId: notebook.id }),
			).rejects.toThrow(
				new ForbiddenError(
					"You must delete this notebook or transfer ownership to leave this notebook.",
				),
			);
		});

		it("doesn't allow non-members to leave", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			await expect(
				service.leaveNotebook({ appUserId: user.id, notebookId: notebook.id }),
			).rejects.toThrow(new ForbiddenError("Could not find notebook membership."));
		});

		it("only affects the caller's membership", async () => {
			const viewer = await userRepo.create();
			const editor = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			const viewerMembership = await notebookMemberRepo.create({
				appUserId: viewer.id,
				notebookId: notebook.id,
				role: "viewer",
			});

			await notebookMemberRepo.create({
				appUserId: editor.id,
				notebookId: notebook.id,
				role: "editor",
			});

			await service.leaveNotebook({ appUserId: editor.id, notebookId: notebook.id });

			const persistedMembership = await notebookMemberRepo.findById({ id: viewerMembership.id });

			expect(persistedMembership).toEqual(viewerMembership);
		});

		it("doesn't affect the caller's membership in other notebooks", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });
			const otherNotebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebook.id,
				role: "viewer",
			});

			const otherMembership = await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: otherNotebook.id,
				role: "viewer",
			});

			await service.leaveNotebook({ appUserId: user.id, notebookId: notebook.id });

			const persistedMembership = await notebookMemberRepo.findById({ id: otherMembership.id });

			expect(persistedMembership).toEqual(otherMembership);
		});
	});

	describe("transferNotebookOwnership", () => {
		it("allows owners to transfer membership to an editor", async () => {
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

			await service.transferNotebookOwnership({
				appUserId: owner.id,
				notebookId: notebook.id,
				memberId: editorMembership.id,
			});

			const updatedOwnerMembership = await notebookMemberRepo.findById({ id: ownerMembership.id });
			const updatedEditorMembership = await notebookMemberRepo.findById({
				id: editorMembership.id,
			});

			expect(updatedOwnerMembership).toMatchObject({
				id: ownerMembership.id,
				appUserId: owner.id,
				notebookId: notebook.id,
				role: "editor",
			});
			expect(updatedEditorMembership).toMatchObject({
				id: editorMembership.id,
				appUserId: editor.id,
				notebookId: notebook.id,
				role: "owner",
			});
		});

		it("allows owners to transfer membership to a viewer", async () => {
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

			await service.transferNotebookOwnership({
				appUserId: owner.id,
				notebookId: notebook.id,
				memberId: viewerMembership.id,
			});

			const updatedOwnerMembership = await notebookMemberRepo.findById({ id: ownerMembership.id });
			const updatedViewerMembership = await notebookMemberRepo.findById({
				id: viewerMembership.id,
			});

			expect(updatedOwnerMembership).toMatchObject({
				id: ownerMembership.id,
				appUserId: owner.id,
				notebookId: notebook.id,
				role: "editor",
			});
			expect(updatedViewerMembership).toMatchObject({
				id: viewerMembership.id,
				appUserId: viewer.id,
				notebookId: notebook.id,
				role: "owner",
			});
		});

		it("returns both updated memberships", async () => {
			const owner = await userRepo.create();
			const targetUser = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			const ownerMembership = await notebookMemberRepo.create({
				appUserId: owner.id,
				notebookId: notebook.id,
				role: "owner",
			});

			const targetMembership = await notebookMemberRepo.create({
				appUserId: targetUser.id,
				notebookId: notebook.id,
				role: "editor",
			});

			const result = await service.transferNotebookOwnership({
				appUserId: owner.id,
				notebookId: notebook.id,
				memberId: targetMembership.id,
			});

			expect(result).toMatchObject({
				yourMembership: {
					id: ownerMembership.id,
					appUserId: owner.id,
					notebookId: notebook.id,
					role: "editor",
				},
				targetMembership: {
					id: targetMembership.id,
					appUserId: targetUser.id,
					notebookId: notebook.id,
					role: "owner",
				},
			});
		});

		it("ensures that exactly one owner remains afterwards", async () => {
			const owner = await userRepo.create();
			const targetUser = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: owner.id,
				notebookId: notebook.id,
				role: "owner",
			});

			const targetMembership = await notebookMemberRepo.create({
				appUserId: targetUser.id,
				notebookId: notebook.id,
				role: "editor",
			});

			await service.transferNotebookOwnership({
				appUserId: owner.id,
				notebookId: notebook.id,
				memberId: targetMembership.id,
			});

			const memberships = await notebookMemberRepo.findForNotebookWithUsers({
				notebookId: notebook.id,
			});

			const owners = memberships.filter((v) => v.notebook_members.role === "owner");

			expect(owners).toHaveLength(1);
		});

		it("doesn't allow non-owners to transfer ownership", async () => {
			for (const role of ["editor", "viewer", "none"] as const) {
				const user = await userRepo.create();
				const targetUser = await userRepo.create();
				const notebook = await notebookRepo.create({ title: "Title" });

				if (role !== "none")
					await notebookMemberRepo.create({
						appUserId: user.id,
						notebookId: notebook.id,
						role,
					});

				const targetMembership = await notebookMemberRepo.create({
					appUserId: targetUser.id,
					notebookId: notebook.id,
					role: "editor",
				});

				await expect(
					service.transferNotebookOwnership({
						appUserId: user.id,
						notebookId: notebook.id,
						memberId: targetMembership.id,
					}),
				).rejects.toThrow(
					new ForbiddenError("Must be the notebook owner to perform this operation."),
				);
			}
		});

		it("doesn't allow owners to transfer ownership to themselves", async () => {
			const user = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			const membership = await notebookMemberRepo.create({
				appUserId: user.id,
				notebookId: notebook.id,
				role: "owner",
			});

			await expect(
				service.transferNotebookOwnership({
					appUserId: user.id,
					notebookId: notebook.id,
					memberId: membership.id,
				}),
			).rejects.toThrow(
				new BadRequestError(
					"UPDATE_SELF_MEMBERSHIP",
					"Cannot transfer ownership back to yourself.",
				),
			);
		});

		it("doesn't allow owners to transfer ownership to members of other notebooks", async () => {
			const owner = await userRepo.create();
			const targetUser = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });
			const otherNotebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: owner.id,
				notebookId: notebook.id,
				role: "owner",
			});

			const targetMembership = await notebookMemberRepo.create({
				appUserId: targetUser.id,
				notebookId: otherNotebook.id,
				role: "editor",
			});

			await expect(
				service.transferNotebookOwnership({
					appUserId: owner.id,
					notebookId: notebook.id,
					memberId: targetMembership.id,
				}),
			).rejects.toThrow(
				new NotFoundError("NOTEBOOK_MEMBERSHIP_NOT_FOUND", "Could not find notebook membership."),
			);
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

		it("serializes concurrent ownership transfers and leaves exactly one owner", async () => {
			const owner = await userRepo.create();
			const editorA = await userRepo.create();
			const editorB = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: owner.id,
				notebookId: notebook.id,
				role: "owner",
			});

			const membershipA = await notebookMemberRepo.create({
				appUserId: editorA.id,
				notebookId: notebook.id,
				role: "editor",
			});

			const membershipB = await notebookMemberRepo.create({
				appUserId: editorB.id,
				notebookId: notebook.id,
				role: "editor",
			});

			const results = await Promise.allSettled([
				service.transferNotebookOwnership({
					appUserId: owner.id,
					notebookId: notebook.id,
					memberId: membershipA.id,
				}),
				service.transferNotebookOwnership({
					appUserId: owner.id,
					notebookId: notebook.id,
					memberId: membershipB.id,
				}),
			]);

			expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
			expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);

			const memberships = await notebookMemberRepo.findForNotebookWithUsers({
				notebookId: notebook.id,
			});

			const owners = memberships.filter(
				(membership) => membership.notebook_members.role === "owner",
			);

			expect(owners).toHaveLength(1);
		});

		it("prevents a member from leaving after a concurrent ownership transfer promotes them to owner", async () => {
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

			const leavePromise = runWhileNotebookLocked(
				notebook.id,
				() =>
					service.leaveNotebook({
						appUserId: editor.id,
						notebookId: notebook.id,
					}),
				(tx) => transferOwnershipDirectly(tx, ownerMembership.id, editorMembership.id),
			);

			await expect(leavePromise).rejects.toThrow(
				new ForbiddenError(
					"You must delete this notebook or transfer ownership to leave this notebook.",
				),
			);

			const membership = await notebookMemberRepo.findById({
				id: editorMembership.id,
			});

			expect(membership?.role).toBe("owner");
		});

		it("prevents an owner from removing a member after a concurrent ownership transfer promotes that member to owner", async () => {
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

			const removePromise = runWhileNotebookLocked(
				notebook.id,
				() =>
					service.removeNotebookMember({
						appUserId: owner.id,
						notebookId: notebook.id,
						memberId: editorMembership.id,
					}),
				(tx) => transferOwnershipDirectly(tx, ownerMembership.id, editorMembership.id),
			);

			await expect(removePromise).rejects.toThrow(
				new ForbiddenError("Must be the notebook owner to perform this operation."),
			);

			const membership = await notebookMemberRepo.findById({
				id: editorMembership.id,
			});

			expect(membership?.role).toBe("owner");
		});

		it("serializes concurrent attempts to add the same user to a notebook", async () => {
			const owner = await userRepo.create();
			const targetUser = await userRepo.create();
			const notebook = await notebookRepo.create({ title: "Title" });

			await notebookMemberRepo.create({
				appUserId: owner.id,
				notebookId: notebook.id,
				role: "owner",
			});

			const results = await Promise.allSettled([
				service.addNotebookMember({
					appUserId: owner.id,
					notebookId: notebook.id,
					data: {
						targetAppUserId: targetUser.id,
						role: "editor",
					},
				}),
				service.addNotebookMember({
					appUserId: owner.id,
					notebookId: notebook.id,
					data: {
						targetAppUserId: targetUser.id,
						role: "editor",
					},
				}),
			]);

			expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1);
			expect(results.filter((result) => result.status === "rejected")).toHaveLength(1);

			const membership = await notebookMemberRepo.findByUserAndNotebook({
				appUserId: targetUser.id,
				notebookId: notebook.id,
			});

			expect(membership).toMatchObject({
				appUserId: targetUser.id,
				notebookId: notebook.id,
				role: "editor",
			});
		});
	});
});
