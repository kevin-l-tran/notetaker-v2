import { eq } from "drizzle-orm";
import type { db } from "../../database/client.ts";
import { type AppUser, appUsers } from "../../database/schema/appUsers.ts";

export function createUserRepository(database: typeof db) {
	return {
		async findById(input: { id: AppUser["id"] }) {
			const res = await database.select().from(appUsers).where(eq(appUsers.id, input.id)).limit(1);

			return res[0];
		},

		async create(input: { displayName: AppUser["displayName"] }) {
			const res = await database
				.insert(appUsers)
				.values({ displayName: input.displayName })
				.returning();

			return res[0];
		},
	};
}
