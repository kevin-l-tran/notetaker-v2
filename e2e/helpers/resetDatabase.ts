import { Client } from "pg";

export default async function resetE2EDatabase(databaseUrl: string) {
	if (process.env.NODE_ENV !== "test") {
		throw new Error("Refusing to reset database unless NODE_ENV=test.");
	}

	if (!databaseUrl) {
		throw new Error("DATABASE_URL is required.");
	}

	const databaseName = new URL(databaseUrl).pathname.slice(1);

	if (!databaseName.includes("notetaker-e2e")) {
		throw new Error(
			`Refusing to reset database "${databaseName}". Expected to contain "notetaker-e2e".`,
		);
	}

	const client = new Client({
		connectionString: databaseUrl,
	});

	try {
		console.log(`Resetting ${databaseName}...`);

		await client.connect();

		await client.query("DROP SCHEMA IF EXISTS public CASCADE");
		await client.query("DROP SCHEMA IF EXISTS drizzle CASCADE");
		await client.query("CREATE SCHEMA public");
	} finally {
		await client.end();
	}

	console.log("E2E database reset complete.");
}
