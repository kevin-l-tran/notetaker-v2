import { defineConfig } from "drizzle-kit";
import { env } from "./src/config/env.ts";

export default defineConfig({
	dialect: "postgresql",
	dbCredentials: {
		url: env.DATABASE_URL,
	},
	schema: "./src/database/schema/index.ts",
	out: "./drizzle",
});
