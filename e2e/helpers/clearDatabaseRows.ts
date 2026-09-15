import { Client } from "pg";

export async function clearDatabaseRows(connectionString: string) {
	const client = new Client({ connectionString });

	await client.connect();

	try {
		await client.query(`
			TRUNCATE TABLE
				account,
				app_users,
				auth_identities,
				session,
				"user",
				verification
			RESTART IDENTITY
			CASCADE
		`);
	} finally {
		await client.end();
	}
}
