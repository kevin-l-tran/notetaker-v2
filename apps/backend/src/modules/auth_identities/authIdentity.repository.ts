import { and, eq } from "drizzle-orm";
import type { db } from "../../database/client.ts";
import type { AppUser } from "../../database/schema/appUsers.ts";
import {
	type AuthIdentity,
	type AuthProviders,
	authIdentities,
} from "../../database/schema/authIdentities.ts";

export function createAuthIdentityRepository(database: typeof db) {
	return {
		async findByProviderSubject(input: {
			provider: AuthProviders;
			providerSubject: AuthIdentity["providerSubject"];
		}) {
			const res = await database
				.select()
				.from(authIdentities)
				.where(
					and(
						eq(authIdentities.provider, input.provider),
						eq(authIdentities.providerSubject, input.providerSubject),
					),
				)
				.limit(1);

			return res[0];
		},

		async create(input: {
			appUserId: AppUser["id"];
			provider: AuthProviders;
			providerSubject: AuthIdentity["providerSubject"];
		}) {
			const res = await database
				.insert(authIdentities)
				.values({
					appUserId: input.appUserId,
					provider: input.provider,
					providerSubject: input.providerSubject,
				})
				.returning();

			return res[0];
		},
	};
}
