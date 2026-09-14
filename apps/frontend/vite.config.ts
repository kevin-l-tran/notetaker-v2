import { reactRouter } from "@react-router/dev/vite";
import babel from "@rolldown/plugin-babel";
import { reactCompilerPreset } from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	return {
		plugins: [reactRouter(), babel({ presets: [reactCompilerPreset()] })],
		server: {
			proxy: {
				"/api": {
					target: env.VITE_BACKEND_URL ?? "http://localhost:3000",
					changeOrigin: true,
				},
			},
		},
	};
});
