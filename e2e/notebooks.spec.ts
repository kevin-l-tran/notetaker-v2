import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

const PASSWORD = "TestPassword123!";

function createEmail() {
	return `e2e-${crypto.randomUUID()}@example.com`;
}

async function register(page: Page, email: string) {
	await page.goto("/register");

	await page.getByLabel("Email").fill(email);
	await page.getByLabel("Password").fill(PASSWORD);

	await page.getByRole("button", { name: "Create account" }).click();

	await expect(page).toHaveURL("/notebooks");
}

async function createNotebook(page: Page, title: string, description = "") {
	await page.getByRole("button", { name: "Create notebook" }).click();

	await page.getByLabel("Title").fill(title);

	if (description) await page.getByLabel("Description (optional)").fill(description);

	await page.getByRole("button", { name: "Create", exact: true }).click();
}

async function openNotebookOptions(page: Page, title: string) {
	const row = page.getByRole("heading", { name: title }).locator("..");

	await row.getByRole("button", { name: "Notebook options" }).click();
}

async function updateNotebook(
	page: Page,
	currentTitle: string,
	newTitle: string,
	newDescription: string,
) {
	await openNotebookOptions(page, currentTitle);
	await page.getByText("Edit details", { exact: true }).click();

	await page.getByLabel("Title").fill(newTitle);
	await page.getByLabel("Description (optional)").fill(newDescription);

	await page.getByRole("button", { name: "Update", exact: true }).click();
}

async function deleteNotebook(page: Page, title: string) {
	await openNotebookOptions(page, title);
	await page.getByText("Delete notebook", { exact: true }).click();

	const dialog = page.getByRole("alertdialog");
	await dialog.getByRole("button", { name: "Delete", exact: true }).click();
}

test.describe("notebooks", () => {
	test("shows the empty state for a user with no notebooks", async ({ page }) => {
		await register(page, createEmail());

		await expect(page.getByRole("heading", { name: "No notebooks yet" })).toBeVisible();
	});

	test("creates a notebook", async ({ page }) => {
		await register(page, createEmail());

		await createNotebook(page, "Topology", "Notes about topology");
		await expect(page.getByRole("heading", { name: "Topology" })).toBeVisible();

		await expect(page.getByText("Notes about topology")).toBeVisible();
	});

	test("persists a created notebook after a page reload", async ({ page }) => {
		await register(page, createEmail());

		await createNotebook(page, "Topology", "Notes about topology");

		await page.reload();

		await expect(page.getByRole("heading", { name: "Topology" })).toBeVisible();
		await expect(page.getByText("Notes about topology")).toBeVisible();
	});

	test("updates a notebook", async ({ page }) => {
		await register(page, createEmail());
		await createNotebook(page, "Topology", "Old description");

		await updateNotebook(page, "Topology", "Algebraic Topology", "Updated description");

		await expect(page.getByRole("heading", { name: "Topology", exact: true })).toHaveCount(0);
		await expect(page.getByRole("heading", { name: "Algebraic Topology" })).toBeVisible();
		await expect(page.getByText("Updated description")).toBeVisible();
	});

	test("persists notebook updates after a page reload", async ({ page }) => {
		await register(page, createEmail());
		await createNotebook(page, "Topology", "Old description");

		await updateNotebook(page, "Topology", "Algebraic Topology", "Updated description");

		await page.reload();

		await expect(page.getByRole("heading", { name: "Algebraic Topology" })).toBeVisible();
		await expect(page.getByText("Updated description")).toBeVisible();
	});

	test("deletes a notebook", async ({ page }) => {
		await register(page, createEmail());
		await createNotebook(page, "Topology");

		await deleteNotebook(page, "Topology");

		await expect(page.getByRole("heading", { name: "Topology" })).toHaveCount(0);
		await expect(page.getByRole("heading", { name: "No notebooks yet" })).toBeVisible();
	});

	test("keeps a deleted notebook removed after a page reload", async ({ page }) => {
		await register(page, createEmail());
		await createNotebook(page, "Topology");

		await deleteNotebook(page, "Topology");

		await page.reload();

		await expect(page.getByRole("heading", { name: "Topology" })).toHaveCount(0);
		await expect(page.getByRole("heading", { name: "No notebooks yet" })).toBeVisible();
	});

	test("does not create a notebook when the create dialog is cancelled", async ({ page }) => {
		await register(page, createEmail());

		await page.getByRole("button", { name: "Create notebook" }).click();
		await page.getByLabel("Title").fill("Topology");

		await page.keyboard.press("Escape");

		await expect(page.getByRole("dialog")).toBeHidden();
		await expect(page.getByRole("heading", { name: "Topology" })).toHaveCount(0);
	});

	test("does not update a notebook when the edit dialog is cancelled", async ({ page }) => {
		await register(page, createEmail());
		await createNotebook(page, "Topology", "Original description");

		await openNotebookOptions(page, "Topology");
		await page.getByText("Edit details", { exact: true }).click();

		await page.getByLabel("Title").fill("Changed title");
		await page.getByLabel("Description (optional)").fill("Changed description");

		await page.keyboard.press("Escape");

		await expect(page.getByRole("heading", { name: "Topology" })).toBeVisible();
		await expect(page.getByRole("heading", { name: "Changed title" })).toHaveCount(0);
		await expect(page.getByText("Original description")).toBeVisible();
	});

	test("does not delete a notebook when the delete dialog is cancelled", async ({ page }) => {
		await register(page, createEmail());
		await createNotebook(page, "Topology");

		await openNotebookOptions(page, "Topology");
		await page.getByText("Delete notebook", { exact: true }).click();

		await page.getByRole("alertdialog").getByRole("button", { name: "Cancel" }).click();

		await expect(page.getByRole("heading", { name: "Topology" })).toBeVisible();
	});
});
