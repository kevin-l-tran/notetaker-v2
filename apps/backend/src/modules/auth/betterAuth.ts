import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth } from "better-auth";
import { env } from "../../config/env.ts";
import { db } from "../../database/client.ts";
import * as authSchema from "../../database/schema/auth.ts";
import { createServiceContext } from "../../shared/services/serviceContext.ts";
import { createAuthService } from "./auth.service.ts";

const serviceContext = createServiceContext(db);
const authService = createAuthService(serviceContext);

const auth = betterAuth({
	database: drizzleAdapter(db, {
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
	},

	baseURL: env.BETTER_AUTH_URL,
	secret: env.BETTER_AUTH_SECRET,
	trustedOrigins: [env.FRONTEND_URL],
});

export default auth;
