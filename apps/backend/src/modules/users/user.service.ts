import type { AppUser } from "../../database/schema/appUsers.ts";
import type { ServiceContext } from "../../shared/services/serviceContext.ts";
import { createUserRepository } from "./user.repository.ts";

export function createUserService(context: ServiceContext) {
	const userRepo = createUserRepository(context.database);

	return {
		createUser() {
			return userRepo.create();
		},

		async getUserById(input: { id: AppUser["id"] }) {
			const user = await userRepo.findById(input);
			if (!user) throw new Error("Could not find user.");

			return user;
		},
	};
}
