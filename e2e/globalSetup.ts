import { fileURLToPath } from "node:url";
import { Client } from "pg";
import migrateDatabase from "./helpers/migrateDatabase";
import resetDatabase from "./helpers/resetDatabase";

const DATABASE_PREFIX = "notetaker-e2e";

function getWorkerDatabaseUrl(baseUrl: string, slot: number) {
	const url = new URL(baseUrl);
	url.pathname = `/${DATABASE_PREFIX}-${slot}`;
	return url.toString();
}

async function createDatabaseIfMissing(adminUrl: string, databaseName: string) {
	const client = new Client({ connectionString: adminUrl });

	await client.connect();

	try {
		const result = await client.query("SELECT 1 FROM pg_database WHERE datname = $1", [
			databaseName,
		]);

		if (result.rowCount === 0) {
			await client.query(`CREATE DATABASE "${databaseName}"`);
		}
	} finally {
		await client.end();
	}
}

export default async function globalSetup() {
	const baseUrl = process.env.E2E_DATABASE_URL;
	const workerCount = Number(process.env.E2E_WORKERS ?? "3");

	if (!baseUrl) {
		throw new Error("E2E_DATABASE_URL is required.");
	}

	if (!Number.isInteger(workerCount) || workerCount < 1) {
		throw new Error("E2E_WORKERS must be a positive integer.");
	}

	const adminUrl = new URL(baseUrl);
	adminUrl.pathname = "/postgres";

	const migrationsFolder = fileURLToPath(new URL("../apps/backend/drizzle", import.meta.url));

	for (let slot = 0; slot < workerCount; slot++) {
		const databaseName = `${DATABASE_PREFIX}-${slot}`;
		const databaseUrl = getWorkerDatabaseUrl(baseUrl, slot);

		console.log(`Preparing ${databaseName}...`);

		await createDatabaseIfMissing(adminUrl.toString(), databaseName);
		await resetDatabase(databaseUrl);
		await migrateDatabase(databaseUrl, migrationsFolder);
	}
}
