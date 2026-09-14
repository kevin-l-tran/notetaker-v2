import { Client } from "pg";

const databaseUrl = process.env.DATABASE_URL;

if (process.env.NODE_ENV !== "test") {
	throw new Error("Refusing to reset database unless NODE_ENV=test.");
}

if (!databaseUrl) {
	throw new Error("DATABASE_URL is required.");
}

const databaseName = new URL(databaseUrl).pathname.slice(1);

if (databaseName !== "notetaker-e2e") {
	throw new Error(`Refusing to reset database "${databaseName}". Expected "notetaker-e2e".`);
}

const client = new Client({
	connectionString: databaseUrl,
});

try {
	console.log(`Resetting ${databaseName}...`);

	await client.connect();

	await client.query("DROP SCHEMA public CASCADE");
	await client.query("CREATE SCHEMA public");
} finally {
	await client.end();
}

console.log("E2E database reset complete.");
console.log("Running migrations...");
