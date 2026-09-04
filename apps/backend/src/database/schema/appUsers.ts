import { snakeCase, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

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
