import { fileURLToPath } from "node:url";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Client, Pool } from "pg";
import { loadEnv } from "vite";
import { sharedTestConfig } from "../../../vitest.shared.ts";

const DATABASE_PREFIX = "notetaker-integration";

export default async function globalSetup() {
	const backendDir = fileURLToPath(new URL("../", import.meta.url));
	const baseUrl = loadEnv("test", backendDir, "").DATABASE_URL;
	const workerCount = sharedTestConfig.maxWorkers;

	if (!baseUrl) {
		throw new Error("DATABASE_URL must be defined in apps/backend/.env.test.");
	}

	const adminUrl = new URL(baseUrl);
	adminUrl.pathname = "/postgres";
	const migrationsFolder = fileURLToPath(new URL("../drizzle/", import.meta.url));

	const admin = new Client({ connectionString: adminUrl.toString() });
	await admin.connect();

	try {
		for (let slot = 1; slot <= workerCount; slot++) {
			const databaseName = `${DATABASE_PREFIX}-${slot}`;
			const databaseUrl = new URL(baseUrl);
			databaseUrl.pathname = `/${databaseName}`;

			console.log(`Preparing ${databaseName}...`);

			await admin.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
			await admin.query(`CREATE DATABASE "${databaseName}"`);

			const pool = new Pool({ connectionString: databaseUrl.toString() });

			try {
				await migrate(drizzle({ client: pool }), { migrationsFolder });
			} finally {
				await pool.end();
			}
		}
	} finally {
		await admin.end();
	}
}
