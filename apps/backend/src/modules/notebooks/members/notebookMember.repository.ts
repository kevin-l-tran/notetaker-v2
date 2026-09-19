import { and, eq } from "drizzle-orm";
import { type AppUser, appUsers } from "../../../database/schema/appUsers.ts";
import {
	type NewNotebookMember,
	type NotebookMember,
	notebookMembers,
} from "../../../database/schema/notebookMembers.ts";
import type { Notebook } from "../../../database/schema/notebooks.ts";
import type { DatabaseExecutor } from "../../../database/types.ts";

export function createNotebookMemberRepository(database: DatabaseExecutor) {
	return {
		async findById(input: { id: NotebookMember["id"] }) {
			const res = await database
				.select()
				.from(notebookMembers)
				.where(eq(notebookMembers.id, input.id))
				.limit(1);

			return res[0];
		},

		async findForNotebookWithUsers(input: { notebookId: Notebook["id"] }) {
			return await database
				.select()
				.from(notebookMembers)
				.innerJoin(appUsers, eq(notebookMembers.appUserId, appUsers.id))
				.where(eq(notebookMembers.notebookId, input.notebookId));
		},

		async findByUserAndNotebook(input: { appUserId: AppUser["id"]; notebookId: Notebook["id"] }) {
			const res = await database
				.select()
				.from(notebookMembers)
				.where(
					and(
						eq(notebookMembers.appUserId, input.appUserId),
						eq(notebookMembers.notebookId, input.notebookId),
					),
				)
				.limit(1);

			return res[0];
		},

		async create(input: {
			appUserId: AppUser["id"];
			notebookId: Notebook["id"];
			role: NewNotebookMember["role"];
		}) {
			const res = await database.insert(notebookMembers).values(input).returning();

			const newNotebookMember = res[0];
			if (!newNotebookMember) throw new Error("Notebook member creation failed.");

			return newNotebookMember;
		},

		async updateRole(input: { id: NotebookMember["id"]; role: NewNotebookMember["role"] }) {
			const res = await database
				.update(notebookMembers)
				.set({ role: input.role })
				.where(eq(notebookMembers.id, input.id))
				.returning();

			return res[0];
		},

		async delete(input: { id: NotebookMember["id"] }) {
			const res = await database
				.delete(notebookMembers)
				.where(eq(notebookMembers.id, input.id))
				.returning();

			return res[0];
		},
	};
}
