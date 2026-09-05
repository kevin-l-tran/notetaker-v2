import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "../config/env.ts";
import { authRelations } from "./schema/auth.ts";

export const pool = new Pool({
	connectionString: env.DATABASE_URL,
});

export const db = drizzle({
	client: pool,
	relations: {
		...authRelations,
	},
});
