import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	outputDir: "./e2e/test_results",
	globalSetup: "./e2e/globalSetup.ts",

	fullyParallel: false,
	workers: 1, // db doesn't support per-worker isolation yet

	retries: process.env.CI ? 2 : 0, // do not retry in local dev

	use: {
		baseURL: "http://localhost:5173",
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
	},

	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
		{
			name: "firefox",
			use: { ...devices["Desktop Firefox"] },
		},
		{
			name: "webkit",
			use: { ...devices["Desktop Safari"] },
		},
	],

	webServer: [
		{
			name: "Backend",
			command: "pnpm --filter @notetaker-v2/backend e2e",
			url: "http://localhost:3000/api/health",
			reuseExistingServer: !process.env.CI,
			timeout: 120000,
		},
		{
			name: "Frontend",
			command: "pnpm --filter @notetaker-v2/frontend dev",
			url: "http://localhost:5173",
			reuseExistingServer: !process.env.CI,
			timeout: 120000,
		},
	],
});
