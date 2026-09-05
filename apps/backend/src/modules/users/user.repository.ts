import { eq } from "drizzle-orm";
import { type AppUser, appUsers } from "../../database/schema/appUsers.ts";
import type { DatabaseExecutor } from "../../database/types.ts";

export function createUserRepository(database: DatabaseExecutor) {
	return {
		async findById(input: { id: AppUser["id"] }) {
			const res = await database.select().from(appUsers).where(eq(appUsers.id, input.id)).limit(1);

			return res[0];
		},

		async create() {
			const res = await database.insert(appUsers).values({}).returning();

			const newUser = res[0];
			if (!newUser) throw new Error("User creation failed.");

			return newUser;
		},
	};
}
