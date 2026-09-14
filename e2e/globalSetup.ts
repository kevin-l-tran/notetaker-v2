import { execSync } from "node:child_process";

export default function globalSetup() {
	execSync("pnpm run db:reset:e2e", {
		cwd: "apps/backend",
		stdio: "inherit",
	});
}
