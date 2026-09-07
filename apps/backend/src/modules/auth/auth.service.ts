import type { AuthIdentity, AuthProviders } from "../../database/schema/authIdentities.ts";
import type { ServiceContext } from "../../shared/services/serviceContext.ts";
import { createUserService } from "../users/user.service.ts";
import { createAuthIdentityRepository } from "./authIdentity.repository.ts";

export function createAuthService(context: ServiceContext) {
	const userService = createUserService(context);
	const authIdentityRepo = createAuthIdentityRepository(context.database);

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
				await context.transaction(async (transactionContext) => {
					const txUserService = createUserService(transactionContext);
					const txAuthIdentityRepo = createAuthIdentityRepository(transactionContext.database);

					const newUser = await txUserService.createUser();

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

			try {
				return await userService.getUserById({ id: authIdentity.appUserId });
			} catch {
				throw new Error("Expected user to exist."); // db invariant violation
			}
		},
	};
}
