import { loadEnv } from "vite";
import { defineProject } from "vitest/config";
import { sharedTestConfig } from "../../vitest.shared.ts";

export default defineProject({
	test: {
		...sharedTestConfig,
		env: loadEnv("test", import.meta.dirname, ""),
		fileParallelism: true,
		environment: "jsdom",
		setupFiles: ["./test/setup.ts"],
	},
});
