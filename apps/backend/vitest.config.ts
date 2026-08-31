import { loadEnv } from "vite";
import { defineProject } from "vitest/config";

export default defineProject({
	test: {
		env: loadEnv("test", import.meta.dirname, ""),
	},
});
