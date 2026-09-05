import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth } from "better-auth";
import { env } from "../../config/env.ts";
import { db } from "../../database/client.ts";
import { createUserService } from "../users/user.service.ts";

const userService = createUserService(db);

const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
	}),
	databaseHooks: {
		session: {
			create: {
				before: async (session) => {
					await userService.ensureAuthenticatedUser({
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
