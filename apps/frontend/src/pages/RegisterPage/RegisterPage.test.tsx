import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createRoutesStub } from "react-router";
import { afterEach, describe, expect, it, vi } from "vitest";
import RegisterPage, { clientLoader } from "./RegisterPage";

const { signUpEmail, getSession } = vi.hoisted(() => ({
	signUpEmail: vi.fn(),
	getSession: vi.fn(),
}));

vi.mock("../../data/auth/authClient", () => ({
	authClient: {
		signUp: {
			email: signUpEmail,
		},
		getSession,
	},
}));

function renderRegisterPage() {
	const Router = createRoutesStub([
		{
			path: "/register",
			Component: RegisterPage,
		},
		{
			path: "/notebooks",
			Component: () => <div>Notebooks</div>,
		},
	]);

	render(<Router initialEntries={["/register"]} />);
}

async function fillForm() {
	const user = userEvent.setup();

	await user.type(screen.getByLabelText("Email"), "user@example.com");
	await user.type(screen.getByLabelText("Password"), "password123");

	return user;
}

describe("RegisterPage", () => {
	afterEach(() => {
		signUpEmail.mockReset();
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

		it("allows unauthenticated users to view register", async () => {
			getSession.mockResolvedValue({
				data: null,
				error: null,
			});

			const result = await clientLoader();

			expect(result).toBeNull();
		});
	});

	describe("component", () => {
		it("renders the register form", () => {
			renderRegisterPage();

			expect(screen.getByLabelText("Email")).toBeInTheDocument();
			expect(screen.getByLabelText("Password")).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument();
		});

		it("does not submit an empty form", async () => {
			renderRegisterPage();
			const user = userEvent.setup();

			await user.click(screen.getByRole("button", { name: "Create account" }));

			expect(signUpEmail).not.toHaveBeenCalled();
		});

		it("submits the entered credentials", async () => {
			signUpEmail.mockResolvedValue({
				data: {},
				error: null,
			});

			renderRegisterPage();
			const user = await fillForm();

			await user.click(screen.getByRole("button", { name: "Create account" }));

			expect(signUpEmail).toHaveBeenCalledWith({
				email: "user@example.com",
				password: "password123",
				name: "user@example.com",
			});
		});

		it("navigates to notebooks after successful sign up", async () => {
			signUpEmail.mockResolvedValue({
				data: {},
				error: null,
			});

			renderRegisterPage();
			const user = await fillForm();

			await user.click(screen.getByRole("button", { name: "Create account" }));

			expect(await screen.findByText("Notebooks")).toBeInTheDocument();
		});

		it("shows a duplicate user error", async () => {
			signUpEmail.mockResolvedValue({
				data: null,
				error: {
					code: "USER_ALREADY_EXISTS",
					status: 401,
				},
			});

			renderRegisterPage();
			const user = await fillForm();

			await user.click(screen.getByRole("button", { name: "Create account" }));

			expect(await screen.findByRole("alert")).toHaveTextContent(
				"An account with this email already exists.",
			);
		});

		it("shows a generic error when the request fails", async () => {
			signUpEmail.mockRejectedValue(new Error("Network error"));

			renderRegisterPage();
			const user = await fillForm();

			await user.click(screen.getByRole("button", { name: "Create account" }));

			expect(await screen.findByRole("alert")).toHaveTextContent(
				"Unable to create an account. Please try again.",
			);
		});

		it("disables the submit button while signing up", async () => {
			signUpEmail.mockImplementation(() => new Promise(() => {}));

			renderRegisterPage();
			const user = await fillForm();

			await user.click(screen.getByRole("button", { name: "Create account" }));

			expect(screen.getByRole("button", { name: "Creating account..." })).toBeDisabled();
		});

		it("clears a previous authentication error when retrying", async () => {
			signUpEmail
				.mockResolvedValueOnce({
					data: null,
					error: {
						code: "PASSWORD_TOO_SHORT",
						status: 401,
					},
				})
				.mockImplementationOnce(() => new Promise(() => {}));

			renderRegisterPage();
			const user = await fillForm();

			await user.click(screen.getByRole("button", { name: "Create account" }));

			expect(await screen.findByRole("alert")).toBeInTheDocument();

			await user.click(screen.getByRole("button", { name: "Create account" }));

			await waitFor(() => {
				expect(screen.queryByRole("alert")).not.toBeInTheDocument();
			});
		});
	});
});
