import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import LoginPage, { clientLoader } from "./LoginPage";

const { signInEmail, getSession } = vi.hoisted(() => ({
	signInEmail: vi.fn(),
	getSession: vi.fn(),
}));

vi.mock("../../data/auth/authClient", () => ({
	authClient: {
		signIn: {
			email: signInEmail,
		},
		getSession,
	},
}));

function renderLoginPage() {
	const Router = createRoutesStub([
		{
			path: "/login",
			Component: LoginPage,
		},
		{
			path: "/notebooks",
			Component: () => <div>Notebooks</div>,
		},
	]);

	render(<Router initialEntries={["/login"]} />);
}

async function fillForm() {
	const user = userEvent.setup();

	await user.type(screen.getByLabelText("Email"), "user@example.com");
	await user.type(screen.getByLabelText("Password"), "password123");

	return user;
}

describe("LoginPage", () => {
	afterEach(() => {
		signInEmail.mockReset();
		getSession.mockReset();
		cleanup();
	});

	describe("client loader", () => {
		it("redirects authenticated users to notebooks", async () => {
			getSession.mockResolvedValue({
				data: {
					session: {},
					user: {},
				},
				error: null,
			});

			const result = await clientLoader();

			expect(result).toBeInstanceOf(Response);
			expect(result?.status).toBe(302);
			expect(result?.headers.get("Location")).toBe("/notebooks");
		});

		it("allows unauthenticated users to view login", async () => {
			getSession.mockResolvedValue({
				data: null,
				error: null,
			});

			const result = await clientLoader();

			expect(result).toBeNull();
		});
	});

	describe("component", () => {
		it("renders the login form", () => {
			renderLoginPage();

			expect(screen.getByLabelText("Email")).toBeInTheDocument();
			expect(screen.getByLabelText("Password")).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Sign in" })).toBeInTheDocument();
		});

		it("does not submit an empty form", async () => {
			renderLoginPage();
			const user = userEvent.setup();

			await user.click(screen.getByRole("button", { name: "Sign in" }));

			expect(signInEmail).not.toHaveBeenCalled();
		});

		it("submits the entered credentials", async () => {
			signInEmail.mockResolvedValue({
				data: {},
				error: null,
			});

			renderLoginPage();
			const user = await fillForm();

			await user.click(screen.getByRole("button", { name: "Sign in" }));

			expect(signInEmail).toHaveBeenCalledWith({
				email: "user@example.com",
				password: "password123",
			});
		});

		it("navigates to notebooks after successful login", async () => {
			signInEmail.mockResolvedValue({
				data: {},
				error: null,
			});

			renderLoginPage();
			const user = await fillForm();

			await user.click(screen.getByRole("button", { name: "Sign in" }));

			expect(await screen.findByText("Notebooks")).toBeInTheDocument();
		});

		it("shows an authentication error", async () => {
			signInEmail.mockResolvedValue({
				data: null,
				error: {
					code: "INVALID_PASSWORD",
					status: 401,
				},
			});

			renderLoginPage();
			const user = await fillForm();

			await user.click(screen.getByRole("button", { name: "Sign in" }));

			expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password.");
		});

		it("shows a generic error when the request fails", async () => {
			signInEmail.mockRejectedValue(new Error("Network error"));

			renderLoginPage();
			const user = await fillForm();

			await user.click(screen.getByRole("button", { name: "Sign in" }));

			expect(await screen.findByRole("alert")).toHaveTextContent(
				"Unable to sign in. Please try again.",
			);
		});

		it("disables the submit button while signing in", async () => {
			signInEmail.mockImplementation(() => new Promise(() => {}));

			renderLoginPage();
			const user = await fillForm();

			await user.click(screen.getByRole("button", { name: "Sign in" }));

			expect(screen.getByRole("button", { name: "Signing in..." })).toBeDisabled();
		});

		it("clears a previous authentication error when retrying", async () => {
			signInEmail
				.mockResolvedValueOnce({
					data: null,
					error: {
						code: "INVALID_PASSWORD",
						status: 401,
					},
				})
				.mockImplementationOnce(() => new Promise(() => {}));

			renderLoginPage();
			const user = await fillForm();

			await user.click(screen.getByRole("button", { name: "Sign in" }));

			expect(await screen.findByRole("alert")).toBeInTheDocument();

			await user.click(screen.getByRole("button", { name: "Sign in" }));

			await waitFor(() => {
				expect(screen.queryByRole("alert")).not.toBeInTheDocument();
			});
		});
	});
});
