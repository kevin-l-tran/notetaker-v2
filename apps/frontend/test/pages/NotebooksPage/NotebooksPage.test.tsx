import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw";
import { createRoutesStub } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import NotebooksPage from "../../../src/pages/NotebooksPage/NotebooksPage";
import { server } from "../../mocks/server";

const notebooks = [
	{
		id: crypto.randomUUID(),
		title: "Topology",
		description: "Notes about topology",
		settings: {},
		createdAt: "2026-09-01T00:00:00.000Z",
		updatedAt: "2026-10-01T00:00:00.000Z",
		myRole: "owner",
	},
	{
		id: crypto.randomUUID(),
		title: "Linear Algebra",
		description: "Notes about linear algebra",
		settings: {},
		createdAt: "2026-09-02T00:00:00.000Z",
		updatedAt: "2026-10-02T00:00:00.000Z",
		myRole: "owner",
	},
	{
		id: crypto.randomUUID(),
		title: "Differential Geometry",
		description: "Notes about differential geometry",
		settings: {},
		createdAt: "2026-09-02T00:00:00.000Z",
		updatedAt: "2026-10-02T00:00:00.000Z",
		myRole: "owner",
	},
	{
		id: crypto.randomUUID(),
		title: "Combinatorics",
		description: "Notes about combinatorics",
		settings: {},
		createdAt: "2026-09-02T00:00:00.000Z",
		updatedAt: "2026-10-02T00:00:00.000Z",
		myRole: "owner",
	},
];

function renderNotebooksPage() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	});

	const Router = createRoutesStub([
		{
			path: "/notebooks",
			Component: NotebooksPage,
		},
	]);

	render(
		<QueryClientProvider client={queryClient}>
			<Router initialEntries={["/notebooks"]} />
		</QueryClientProvider>,
	);
}

describe("NotebooksPage", () => {
	beforeEach(() => {
		server.use(
			http.get("/api/notebooks", () => {
				return HttpResponse.json(notebooks);
			}),
		);
	});

	afterEach(() => {
		cleanup();
	});

	it("renders notebooks returned by the API", async () => {
		renderNotebooksPage();

		expect(await screen.findByRole("heading", { name: "Topology" })).toBeInTheDocument();
		expect(screen.getByText("Notes about topology")).toBeInTheDocument();

		expect(screen.getByRole("heading", { name: "Linear Algebra" })).toBeInTheDocument();
		expect(screen.getByText("Notes about linear algebra")).toBeInTheDocument();

		expect(screen.getByRole("heading", { name: "Differential Geometry" })).toBeInTheDocument();
		expect(screen.getByText("Notes about differential geometry")).toBeInTheDocument();

		expect(screen.getByRole("heading", { name: "Combinatorics" })).toBeInTheDocument();
		expect(screen.getByText("Notes about combinatorics")).toBeInTheDocument();
	});

	it("shows a loading state while notebooks are loading", () => {
		renderNotebooksPage();

		expect(screen.getByPlaceholderText("Search notebooks...")).toBeDisabled();
	});

	it("shows an error state and allows the user to retry", async () => {
		let shouldFail = true;
		server.use(
			http.get("/api/notebooks", () => {
				if (shouldFail) {
					return HttpResponse.json({}, { status: 500 });
				}

				return HttpResponse.json(notebooks);
			}),
		);

		renderNotebooksPage();
		const user = userEvent.setup();

		const retry = await screen.findByRole("button", { name: "Try again" });
		shouldFail = false;
		await user.click(retry);

		expect(await screen.findByRole("heading", { name: "Topology" })).toBeInTheDocument();
	});

	it("filters notebooks using the search input", async () => {
		renderNotebooksPage();
		const user = userEvent.setup();

		await screen.findByRole("heading", { name: "Topology" });
		await user.type(screen.getByPlaceholderText("Search notebooks..."), "linear");

		expect(screen.getByRole("heading", { name: "Linear Algebra" })).toBeInTheDocument();
		expect(screen.queryByRole("heading", { name: "Topology" })).not.toBeInTheDocument();
		expect(screen.queryByRole("heading", { name: "Combinatorics" })).not.toBeInTheDocument();
	});

	it("sorts notebooks using the selected sort option", async () => {
		renderNotebooksPage();
		const user = userEvent.setup();

		await screen.findByRole("heading", { name: "Topology" });
		await user.click(screen.getByRole("combobox", { name: "Sort notebooks" }));
		await user.click(screen.getByText("Title A-Z"));

		const titles = screen
			.getAllByRole("heading", { level: 2 })
			.map((heading) => heading.textContent);
		expect(titles).toEqual([
			"Combinatorics",
			"Differential Geometry",
			"Linear Algebra",
			"Topology",
		]);
	});

	it("opens the create notebook dialog", async () => {
		renderNotebooksPage();
		const user = userEvent.setup();

		await user.click(screen.getByRole("button", { name: "New Notebook" }));

		expect(await screen.findByRole("dialog")).toBeInTheDocument();

		await user.keyboard("{Escape}");
	});

	it("opens the update and delete dialogs for the selected notebook", async () => {
		renderNotebooksPage();
		const user = userEvent.setup();

		const heading = await screen.findByRole("heading", {
			name: "Linear Algebra",
		});

		const row = heading.parentElement as HTMLElement;
		const optionsButton = within(row).getByRole("button", {
			name: "Notebook options",
		});

		optionsButton.focus();
		await user.keyboard("{Enter}");

		await user.click(
			await screen.findByRole("menuitem", {
				name: "Edit details",
			}),
		);

		expect(await screen.findByRole("dialog")).toBeInTheDocument();

		await user.keyboard("{Escape}");

		await waitFor(() => {
			expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
		});

		optionsButton.focus();
		await user.keyboard("{Enter}");

		await user.click(
			await screen.findByRole("menuitem", {
				name: "Delete notebook",
			}),
		);

		expect(await screen.findByRole("alertdialog")).toBeInTheDocument();
	});
});
