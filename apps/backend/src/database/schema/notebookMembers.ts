import { NotebookMemberRoles } from "@notetaker-v2/contracts";
import { pgEnum, snakeCase, unique, uuid } from "drizzle-orm/pg-core";
import { appUsers } from "./appUsers.ts";
import { notebooks } from "./notebooks.ts";

export const notebookMemberRole = pgEnum("notebook_member_role", NotebookMemberRoles);

export const notebookMembers = snakeCase.table(
	"notebook_members",
	{
		id: uuid().defaultRandom().primaryKey(),
		appUserId: uuid()
			.references(() => appUsers.id, { onDelete: "cascade" })
			.notNull(),
		notebookId: uuid()
			.references(() => notebooks.id, { onDelete: "cascade" })
			.notNull(),
		role: notebookMemberRole().notNull(),
	},
	(t) => [unique().on(t.appUserId, t.notebookId)],
);

export type NotebookMember = typeof notebookMembers.$inferSelect;
export type NewNotebookMember = typeof notebookMembers.$inferInsert;
