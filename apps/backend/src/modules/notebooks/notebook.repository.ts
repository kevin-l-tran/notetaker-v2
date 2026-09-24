import { and, eq, getColumns } from "drizzle-orm";
import type { AppUser } from "../../database/schema/appUsers.ts";
import { notebookMembers } from "../../database/schema/notebookMembers.ts";
import { type NewNotebook, type Notebook, notebooks } from "../../database/schema/notebooks.ts";
import type { DatabaseExecutor } from "../../database/types.ts";

export function createNotebookRepository(database: DatabaseExecutor) {
	return {
		async findById(input: { id: Notebook["id"] }) {
			const res = await database
				.select()
				.from(notebooks)
				.where(eq(notebooks.id, input.id))
				.limit(1);

			return res[0];
		},

		async findByIdForUpdate(input: { id: Notebook["id"] }) {
			const res = await database
				.select()
				.from(notebooks)
				.for("update")
				.where(eq(notebooks.id, input.id))
				.limit(1);

			return res[0];
		},

		async findForUser(input: { appUserId: AppUser["id"] }) {
			return await database
				.select({ ...getColumns(notebooks), role: notebookMembers.role })
				.from(notebooks)
				.innerJoin(notebookMembers, eq(notebooks.id, notebookMembers.notebookId))
				.where(eq(notebookMembers.appUserId, input.appUserId));
		},

		async findByIdForUser(input: { appUserId: AppUser["id"]; notebookId: Notebook["id"] }) {
			return await database
				.select({ ...getColumns(notebooks), role: notebookMembers.role })
				.from(notebooks)
				.innerJoin(notebookMembers, eq(notebooks.id, notebookMembers.notebookId))
				.where(
					and(eq(notebookMembers.appUserId, input.appUserId), eq(notebooks.id, input.notebookId)),
				);
		},

		async create(input: { title: NewNotebook["title"]; description: NewNotebook["description"] }) {
			const res = await database.insert(notebooks).values(input).returning();

			const newNotebook = res[0];
			if (!newNotebook) throw new Error("Notebook creation failed.");

			return newNotebook;
		},

		async update(input: {
			id: Notebook["id"];
			title?: NewNotebook["title"];
			description?: NewNotebook["description"];
		}) {
			const res = await database
				.update(notebooks)
				.set({ title: input.title, description: input.description })
				.where(eq(notebooks.id, input.id))
				.returning();

			return res[0];
		},

		async delete(input: { id: Notebook["id"] }) {
			const res = await database.delete(notebooks).where(eq(notebooks.id, input.id)).returning();

			return res[0];
		},
	};
}
