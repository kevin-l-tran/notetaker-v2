import { type ChildProcess, execFile, spawn } from "node:child_process";
import { once } from "node:events";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { test as base, expect } from "@playwright/test";
import { clearDatabaseRows } from "./helpers/clearDatabaseRows";

const execFileAsync = promisify(execFile);

const DATABASE_PREFIX = "notetaker-e2e";
const BACKEND_PORT_BASE = 3100;
const FRONTEND_URL = "http://localhost:5174";
const BACKEND_DIR = fileURLToPath(new URL("../apps/backend/", import.meta.url));

const backendRequire = createRequire(path.join(BACKEND_DIR, "package.json"));
const TSX_CLI = backendRequire.resolve("tsx/cli");

type WorkerFixtures = {
	databaseUrl: string;
	backendUrl: string;
};

type TestFixtures = {
	// biome-ignore lint/suspicious/noConfusingVoidType: is param type
	resetDatabase: void;
	// biome-ignore lint/suspicious/noConfusingVoidType: is param type
	routeApi: void;
};

function getDatabaseUrl(slot: number) {
	const baseUrl = process.env.E2E_DATABASE_URL;

	if (!baseUrl) {
		throw new Error("E2E_DATABASE_URL is required.");
	}

	const url = new URL(baseUrl);
	url.pathname = `/${DATABASE_PREFIX}-${slot}`;

	return url.toString();
}

function startBackend(port: number, databaseUrl: string, backendUrl: string, frontendUrl: string) {
	return spawn(process.execPath, [TSX_CLI, "src/server.ts"], {
		cwd: BACKEND_DIR,
		env: {
			...process.env,
			NODE_ENV: "test",
			PORT: String(port),
			DATABASE_URL: databaseUrl,
			BETTER_AUTH_SECRET: "e2e-secret-that-is-at-least-32-characters-long",
			BETTER_AUTH_URL: backendUrl,
			FRONTEND_URL: frontendUrl,
		},
		stdio: "inherit",
		shell: false,
		detached: process.platform !== "win32",
	});
}

async function stopProcess(child: ChildProcess) {
	if (child.pid === undefined || child.exitCode !== null) {
		return;
	}

	if (process.platform === "win32") {
		await execFileAsync("taskkill", ["/pid", String(child.pid), "/t", "/f"]).catch(() => undefined);

		return;
	}

	try {
		process.kill(-child.pid, "SIGTERM");
	} catch {
		return;
	}

	await Promise.race([once(child, "exit"), new Promise((resolve) => setTimeout(resolve, 5_000))]);

	if (child.exitCode === null) {
		try {
			process.kill(-child.pid, "SIGKILL");
		} catch {
			// Process already exited.
		}
	}
}

async function waitForServer(url: string, child: ChildProcess, timeout = 30_000) {
	const deadline = Date.now() + timeout;

	while (Date.now() < deadline) {
		if (child.exitCode !== null) {
			throw new Error(`Backend exited before becoming ready: ${url}`);
		}

		try {
			const response = await fetch(url);

			if (response.ok) {
				return;
			}
		} catch {
			// Backend is not ready yet.
		}

		await new Promise((resolve) => setTimeout(resolve, 250));
	}

	throw new Error(`Timed out waiting for ${url}`);
}

export const test = base.extend<TestFixtures, WorkerFixtures>({
	databaseUrl: [
		// biome-ignore lint/correctness/noEmptyPattern: destructured param is required
		async ({}, use, workerInfo) => {
			await use(getDatabaseUrl(workerInfo.parallelIndex));
		},
		{ scope: "worker" },
	],

	backendUrl: [
		async ({ databaseUrl }, use, workerInfo) => {
			const port = BACKEND_PORT_BASE + workerInfo.parallelIndex;
			const backendUrl = `http://localhost:${port}`;

			const backend = startBackend(port, databaseUrl, backendUrl, FRONTEND_URL);

			try {
				await waitForServer(`${backendUrl}/api/health`, backend);

				await use(backendUrl);
			} finally {
				await stopProcess(backend);
			}
		},
		{ scope: "worker" },
	],

	resetDatabase: [
		async ({ databaseUrl }, use) => {
			await clearDatabaseRows(databaseUrl);
			await use();
		},
		{ auto: true },
	],

	routeApi: [
		async ({ context, backendUrl }, use) => {
			const route = await context.route("**/api/**", async (route) => {
				const requestUrl = new URL(route.request().url());

				const backendRequestUrl = new URL(requestUrl.pathname + requestUrl.search, backendUrl);

				const response = await route.fetch({
					url: backendRequestUrl.toString(),
				});

				await route.fulfill({ response });
			});

			await use();

			await route.dispose();
		},
		{ auto: true },
	],
});

export { expect };
