import { Client } from "pg";

export async function clearDatabaseRows() {
	const connectionString = process.env.E2E_DATABASE_URL;

	if (!connectionString) {
		throw new Error("E2E_DATABASE_URL is not defined");
	}

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
