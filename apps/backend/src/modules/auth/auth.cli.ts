import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { betterAuth } from "better-auth";
import { env } from "../../config/env.ts";
import { db } from "../../database/client.ts";
import * as authSchema from "../../database/schema/auth.ts";

export const auth = betterAuth({
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: authSchema,
	}),
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
