import { loadEnv } from "vite";
import { defineProject } from "vitest/config";
import { sharedTestConfig } from "../../vitest.shared.ts";

export default defineProject({
	test: {
		...sharedTestConfig,
		env: loadEnv("test", import.meta.dirname, ""),
		environment: "node",
		pool: "forks",
		fileParallelism: true,
		globalSetup: "./tests/globalSetup.ts",
		setupFiles: ["./tests/setupTests.ts"],
	},
});
