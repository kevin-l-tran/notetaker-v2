import type { AppUser } from "../../database/schema/appUsers.ts";
import type { AuthIdentity, AuthProviders } from "../../database/schema/authIdentities.ts";
import type { Database } from "../../database/types.ts";
import { createAuthIdentityRepository } from "../auth_identities/authIdentity.repository.ts";
import { createUserRepository } from "./user.repository.ts";

export function createUserService(database: Database) {
	return {
		async resolveAuthenticatedUser(input: {
			provider: AuthProviders;
			subject: AuthIdentity["providerSubject"];
			displayName?: AppUser["displayName"];
		}) {
			return await database.transaction(async (tx) => {
				const userRepo = createUserRepository(tx);
				const authIdentityRepo = createAuthIdentityRepository(tx);

				const authIdentity = await authIdentityRepo.findByProviderSubject({
					provider: input.provider,
					providerSubject: input.subject,
				});

				if (authIdentity === undefined) {
					const newUser = await userRepo.create({ displayName: input.displayName ?? null });

					await authIdentityRepo.create({
						appUserId: newUser.id,
						provider: input.provider,
						providerSubject: input.subject,
					});

					return newUser;
				}

				const user = await userRepo.findById({ id: authIdentity.appUserId });

				if (!user) throw new Error("Could not find user.");
				return user;
			});
		},
	};
}
