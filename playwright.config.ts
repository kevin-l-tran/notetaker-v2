import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
	testDir: "./e2e",
	outputDir: "./e2e/test_results",
	globalSetup: "./e2e/globalSetup.ts",

	fullyParallel: true,
	workers: Number(process.env.E2E_WORKERS ?? "3"),

	retries: process.env.CI ? 2 : 0, // do not retry in local dev

	use: {
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
			name: "Frontend",
			command: "pnpm --filter @notetaker-v2/frontend dev:e2e",
			url: "http://localhost:5174",
			reuseExistingServer: false,
			timeout: 120000,
		},
	],
});
