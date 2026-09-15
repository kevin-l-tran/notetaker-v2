import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

export default async function migrateDatabase(databaseUrl: string, migrationsFolder: string) {
	const pool = new Pool({
		connectionString: databaseUrl,
	});

	const db = drizzle({ client: pool });

	try {
		await migrate(db, {
			migrationsFolder,
		});
	} finally {
		await pool.end();
	}
}
