import { pgEnum, primaryKey, snakeCase, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { user } from "./auth.ts";

export const authProviderEnum = pgEnum("auth_provider", ["better-auth"]);
export type AuthProviders = typeof authProviderEnum.enumValues;

export const authIdentities = snakeCase.table(
	"auth_identities",
	{
		id: uuid().defaultRandom().primaryKey(),
		appUserId: uuid()
			.references(() => appUsers.id, { onDelete: "cascade" })
			.notNull(),
		provider: authProviderEnum().notNull(),
		providerSubject: text()
			.references(() => user.id, { onDelete: "cascade" })
			.notNull(),
	},
	(table) => [primaryKey({ columns: [table.provider, table.providerSubject] })],
);
export type AuthIdentity = typeof authIdentities.$inferSelect;
export type NewAuthIdentity = typeof authIdentities.$inferInsert;

export const appUsers = snakeCase.table("app_users", {
	id: uuid().defaultRandom().primaryKey(),
	displayName: varchar(),
	createdAt: timestamp({ precision: 6, withTimezone: true }).defaultNow().notNull(),
	updatedAt: timestamp({ precision: 6, withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date())
		.notNull(),
});
export type AppUser = typeof appUsers.$inferSelect;
export type NewAppUser = typeof appUsers.$inferInsert;
