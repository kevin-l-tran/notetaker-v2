import { type ChildProcess, execFile, spawn } from "node:child_process";
import { once } from "node:events";
import { createServer, type Server } from "node:http";
import { createRequire } from "node:module";
import type { Socket } from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { test as base, expect } from "@playwright/test";
import { createProxyServer } from "httpxy";
import { clearDatabaseRows } from "./helpers/clearDatabaseRows";

const execFileAsync = promisify(execFile);

const DATABASE_PREFIX = "notetaker-e2e";
const FRONTEND_URL = "http://localhost:5174";
const BACKEND_PORT_BASE = 3100;
const PROXY_PORT_BASE = 5200;
const BACKEND_DIR = fileURLToPath(new URL("../apps/backend/", import.meta.url));

const backendRequire = createRequire(path.join(BACKEND_DIR, "package.json"));
const TSX_CLI = backendRequire.resolve("tsx/cli");

type WorkerFixtures = {
	databaseUrl: string;
	backendUrl: string;
	proxyUrl: string;
};

type TestFixtures = {
	// biome-ignore lint/suspicious/noConfusingVoidType: is param type
	resetDatabase: void;
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

async function startProxy(port: number, backendUrl: string, frontendUrl: string) {
	const proxy = createProxyServer({
		ws: true,
	});

	function isConnectionReset(error: unknown) {
		return (
			error instanceof Error &&
			"code" in error &&
			(error as NodeJS.ErrnoException).code === "ECONNRESET"
		);
	}

	const server = createServer(async (request, response) => {
		const target = request.url?.startsWith("/api/") ? backendUrl : frontendUrl;

		try {
			await proxy.web(request, response, {
				target,
				changeOrigin: false,
			});
		} catch (error) {
			if (isConnectionReset(error)) {
				return;
			}

			console.error("Proxy request failed:", error);

			if (!response.headersSent && !response.destroyed) {
				response.writeHead(502);
				response.end("Bad Gateway");
			} else if (!response.destroyed) {
				response.destroy();
			}
		}
	});

	server.on("upgrade", async (request, socket, head) => {
		const target = request.url?.startsWith("/api/") ? backendUrl : frontendUrl;

		try {
			await proxy.ws(
				request,
				socket as Socket,
				{
					target,
					changeOrigin: false,
				},
				head,
			);
		} catch (error) {
			if (isConnectionReset(error)) {
				return;
			}

			console.error("WebSocket proxy failed:", error);

			if (!socket.destroyed) {
				socket.destroy();
			}
		}
	});

	await new Promise<void>((resolve, reject) => {
		server.once("error", reject);
		server.listen(port, "localhost", resolve);
	});

	return server;
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

async function stopServer(server: Server) {
	await new Promise<void>((resolve, reject) => {
		server.close((error) => {
			if (error) {
				reject(error);
			} else {
				resolve();
			}
		});
	});
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
			const backendPort = BACKEND_PORT_BASE + workerInfo.parallelIndex;
			const backendUrl = `http://localhost:${backendPort}`;

			const proxyPort = PROXY_PORT_BASE + workerInfo.parallelIndex;
			const frontendUrl = `http://localhost:${proxyPort}`;

			const backend = startBackend(backendPort, databaseUrl, backendUrl, frontendUrl);

			try {
				await waitForServer(`${backendUrl}/api/health`, backend);

				await use(backendUrl);
			} finally {
				await stopProcess(backend);
			}
		},
		{ scope: "worker" },
	],

	proxyUrl: [
		async ({ backendUrl }, use, workerInfo) => {
			const port = PROXY_PORT_BASE + workerInfo.parallelIndex;
			const proxyUrl = `http://localhost:${port}`;

			const server = await startProxy(port, backendUrl, FRONTEND_URL);

			try {
				await use(proxyUrl);
			} finally {
				await stopServer(server);
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

	baseURL: async ({ proxyUrl }, use) => {
		await use(proxyUrl);
	},
});

export { expect };
