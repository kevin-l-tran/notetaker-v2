import "@testing-library/jest-dom/vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { createRoutesStub } from "react-router";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import NotebooksPage from "../../../src/pages/NotebooksPage/NotebooksPage";
import { server } from "../../mocks/server";

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
				return HttpResponse.json([
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
				]);
			}),
		);

		renderNotebooksPage();
	});

	afterEach(() => {
		cleanup();
	});

	it("renders notebooks returned by the API", async () => {
		expect(await screen.findByRole("heading", { name: "Topology" })).toBeInTheDocument();
		expect(screen.getByText("Notes about topology")).toBeInTheDocument();

		expect(screen.getByRole("heading", { name: "Linear Algebra" })).toBeInTheDocument();
		expect(screen.getByText("Notes about linear algebra")).toBeInTheDocument();

		expect(screen.getByRole("heading", { name: "Differential Geometry" })).toBeInTheDocument();
		expect(screen.getByText("Notes about differential geometry")).toBeInTheDocument();

		expect(screen.getByRole("heading", { name: "Combinatorics" })).toBeInTheDocument();
		expect(screen.getByText("Notes about combinatorics")).toBeInTheDocument();
	});

	it("shows a loading state while notebooks are loading", () => {});

	it("shows an error state and allows the user to retry", () => {});

	it("filters notebooks using the search input", () => {});

	it("sorts notebooks using the selected sort option", () => {});

	it("opens the create notebook dialog", () => {});

	it("opens the update and delete dialogs for the selected notebook", () => {});
});
