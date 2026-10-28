import { sharedTestConfig } from "../../../vitest.shared.ts";

const baseUrl = process.env.DATABASE_URL;
const rawPoolId = process.env.VITEST_POOL_ID;
const workerCount = sharedTestConfig.maxWorkers;
const slot = Number(rawPoolId);

if (!baseUrl) {
	throw new Error("DATABASE_URL is required for integration tests.");
}

if (!rawPoolId || !Number.isInteger(slot) || slot < 1 || slot > workerCount) {
	throw new Error(`Unexpected Vitest worker pool ID: ${rawPoolId}`);
}

const databaseUrl = new URL(baseUrl);
databaseUrl.pathname = `/notetaker-integration-${slot}`;

// Runs before test files are imported, so database clients use the worker's DB.
process.env.DATABASE_URL = databaseUrl.toString();
