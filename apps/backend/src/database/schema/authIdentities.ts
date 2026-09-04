import { pgEnum, primaryKey, snakeCase, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { appUsers } from "./appUsers.ts";
import { user } from "./auth.ts";

export const authProviderEnum = pgEnum("auth_provider", ["better-auth", "test"]);
export type AuthProviders = (typeof authProviderEnum.enumValues)[number];

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
		createdAt: timestamp({ precision: 6, withTimezone: true }).defaultNow().notNull(),
		updatedAt: timestamp({ precision: 6, withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [primaryKey({ columns: [table.provider, table.providerSubject] })],
);
export type AuthIdentity = typeof authIdentities.$inferSelect;
export type NewAuthIdentity = typeof authIdentities.$inferInsert;
