import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth } from "better-auth";
import { env } from "../../config/env.ts";
import * as authSchema from "../../database/schema/auth.ts";
import type { Database } from "../../database/types.ts";
import type { ServiceContext } from "../../shared/services/serviceContext.ts";
import { createAuthService } from "./auth.service.ts";

export type Auth = ReturnType<typeof createAuth>;
export function createAuth(input: { database: Database; context: ServiceContext }) {
	const authService = createAuthService(input.context);

	return betterAuth({
		database: drizzleAdapter(input.database, {
			provider: "pg",
			schema: authSchema,
		}),
		databaseHooks: {
			session: {
				create: {
					before: async (session) => {
						await authService.ensureAuthenticatedUser({
							provider: "better-auth",
							subject: session.userId,
						});
					},
				},
			},
		},
		emailAndPassword: {
			enabled: true,
			minPasswordLength: 8,
			maxPasswordLength: 128,
			autoSignIn: true,
		},

		baseURL: env.BETTER_AUTH_URL,
		secret: env.BETTER_AUTH_SECRET,
		trustedOrigins: [env.FRONTEND_URL],
	});
}
