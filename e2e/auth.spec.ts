import { expect, type Page, test } from "@playwright/test";
import { clearDatabaseRows } from "./helpers/clearDatabaseRows";

const PASSWORD = "TestPassword123!";

function createEmail() {
	return `e2e-${crypto.randomUUID()}@example.com`;
}

async function register(page: Page, email: string, password = PASSWORD) {
	await page.goto("/register");

	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill(password);

	await page.getByRole("button", { name: "Create account" }).click();
}

async function login(page: Page, email: string, password = PASSWORD) {
	await page.goto("/login");

	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill(password);

	await page.getByRole("button", { name: "Sign in" }).click();
}

async function logout(page: Page) {
	await page.getByRole("button", { name: "Log out" }).click();

	await expect(page).toHaveURL("/login");
}

test.describe("authentication", () => {
	test.beforeEach(async () => {
		await clearDatabaseRows();
	});

	test("registers and persists the session across a page reload", async ({ page }) => {
		const email = createEmail();

		await register(page, email);
		await expect(page).toHaveURL("/notebooks");

		await page.reload();

		await expect(page).toHaveURL("/notebooks");
	});

	test("doesn't register a taken email", async ({ page }) => {
		const email = createEmail();

		await register(page, email);

		await logout(page);

		await page.goto("/register");
		await register(page, email);

		await expect(page).toHaveURL("/register");
		await expect(page.getByRole("alert")).toContainText(
			"An account with this email already exists.",
		);
	});

	test("logs out and can no longer access protected routes", async ({ page }) => {
		const email = createEmail();

		await register(page, email);

		await logout(page);

		await page.goto("/notebooks");

		await expect(page).toHaveURL("/login");
	});

	test("can log back in after logging out", async ({ page }) => {
		const email = createEmail();

		await register(page, email);
		await logout(page);

		await login(page, email);

		await expect(page).toHaveURL("/notebooks");
	});

	test("rejects invalid credentials", async ({ page }) => {
		await page.goto("/login");

		await page.getByLabel("Email").fill(createEmail());
		await page.getByLabel("Password").fill("IncorrectPassword123!");

		await page.getByRole("button", { name: "Sign in" }).click();

		await expect(page).toHaveURL("/login");

		await expect(page.getByRole("alert")).toContainText("Invalid email or password.");
	});

	test("redirects an unauthenticated user away from protected routes", async ({ page }) => {
		await page.goto("/notebooks");

		await expect(page).toHaveURL("/login");
	});
});
