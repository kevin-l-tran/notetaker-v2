import type { AuthIdentity, AuthProviders } from "../../database/schema/authIdentities.ts";
import type { Database } from "../../database/types.ts";
import { createAuthIdentityRepository } from "../auth_identities/authIdentity.repository.ts";
import { createUserRepository } from "./user.repository.ts";

export function createUserService(database: Database) {
	const userRepo = createUserRepository(database);
	const authIdentityRepo = createAuthIdentityRepository(database);

	return {
		async ensureAuthenticatedUser(input: {
			provider: AuthProviders;
			subject: AuthIdentity["providerSubject"];
		}) {
			const authIdentity = await authIdentityRepo.findByProviderSubject({
				provider: input.provider,
				providerSubject: input.subject,
			});

			if (authIdentity === undefined) {
				await database.transaction(async (tx) => {
					const txUserRepo = createUserRepository(tx);
					const txAuthIdentityRepo = createAuthIdentityRepository(tx);

					const newUser = await txUserRepo.create();

					await txAuthIdentityRepo.create({
						appUserId: newUser.id,
						provider: input.provider,
						providerSubject: input.subject,
					});
				});
			}
		},

		async getAuthenticatedUser(input: {
			provider: AuthProviders;
			subject: AuthIdentity["providerSubject"];
		}) {
			const authIdentity = await authIdentityRepo.findByProviderSubject({
				provider: input.provider,
				providerSubject: input.subject,
			});
			if (!authIdentity) throw new Error("Expected auth identity to exist.");

			const user = await userRepo.findById({ id: authIdentity.appUserId });
			if (!user) throw new Error("Could not find user.");

			return user;
		},
	};
}
