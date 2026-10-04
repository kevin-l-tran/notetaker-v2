import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw/http";
import { delay } from "msw/utils/delay";
import { createRoutesStub } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import LoginPage, { clientLoader } from "../../../src/pages/LoginPage/LoginPage";
import { server } from "../../mocks/server";

const user = {
	id: "user-1",
	name: "user@example.com",
	email: "user@example.com",
	emailVerified: true,
	image: null,
	createdAt: "2026-10-01T00:00:00.000Z",
	updatedAt: "2026-10-01T00:00:00.000Z",
};

const session = {
	id: "session-1",
	userId: user.id,
	token: "test-token",
	expiresAt: "2026-10-10T00:00:00.000Z",
	createdAt: "2026-10-01T00:00:00.000Z",
	updatedAt: "2026-10-01T00:00:00.000Z",
};

function successfulSignInResponse() {
	return HttpResponse.json({
		redirect: false,
		token: "test-token",
		user,
	});
}

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
		cleanup();
	});

	describe("client loader", () => {
		it("redirects authenticated users to notebooks", async () => {
			let wasCalled = false;

			server.use(
				http.get("*/api/auth/get-session", () => {
					wasCalled = true;
					return HttpResponse.json({ session, user });
				}),
			);

			const result = await clientLoader();

			expect(wasCalled).toBe(true);
			expect(result).toBeInstanceOf(Response);
			expect(result?.status).toBe(302);
			expect(result?.headers.get("Location")).toBe("/notebooks");
		});

		it("allows unauthenticated users to view login", async () => {
			server.use(
				http.get("*/api/auth/get-session", () => {
					return HttpResponse.json(null);
				}),
			);

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
			let requestCount = 0;
			server.use(
				http.post("*/api/auth/sign-in/email", () => {
					requestCount += 1;
					return successfulSignInResponse();
				}),
			);

			renderLoginPage();
			const user = userEvent.setup();

			await user.click(screen.getByRole("button", { name: "Sign in" }));

			expect(requestCount).toBe(0);
		});

		it("submits the entered credentials", async () => {
			let requestBody: unknown;
			server.use(
				http.post("*/api/auth/sign-in/email", async ({ request }) => {
					requestBody = await request.json();
					return successfulSignInResponse();
				}),
			);

			renderLoginPage();
			const user = await fillForm();

			await user.click(screen.getByRole("button", { name: "Sign in" }));

			await waitFor(() => {
				expect(requestBody).toEqual({
					email: "user@example.com",
					password: "password123",
				});
			});
		});

		it("navigates to notebooks after successful login", async () => {
			server.use(http.post("*/api/auth/sign-in/email", () => successfulSignInResponse()));

			renderLoginPage();
			const user = await fillForm();

			await user.click(screen.getByRole("button", { name: "Sign in" }));

			expect(await screen.findByText("Notebooks")).toBeInTheDocument();
		});

		it("shows an authentication error", async () => {
			server.use(
				http.post("*/api/auth/sign-in/email", () => {
					return HttpResponse.json(
						{
							code: "INVALID_PASSWORD",
							message: "Invalid password.",
						},
						{ status: 401 },
					);
				}),
			);

			renderLoginPage();
			const user = await fillForm();

			await user.click(screen.getByRole("button", { name: "Sign in" }));

			expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password.");
		});

		it("shows a generic error when the request fails", async () => {
			server.use(http.post("*/api/auth/sign-in/email", () => HttpResponse.error()));

			renderLoginPage();
			const user = await fillForm();

			await user.click(screen.getByRole("button", { name: "Sign in" }));

			expect(await screen.findByRole("alert")).toHaveTextContent(
				"Unable to sign in. Please try again.",
			);
		});

		it("disables the submit button while signing in", async () => {
			server.use(
				http.post("*/api/auth/sign-in/email", async () => {
					await delay("infinite");
					return successfulSignInResponse();
				}),
			);

			renderLoginPage();
			const user = await fillForm();

			await user.click(screen.getByRole("button", { name: "Sign in" }));

			expect(screen.getByRole("button", { name: "Signing in..." })).toBeDisabled();
		});

		it("clears a previous authentication error when retrying", async () => {
			let requestCount = 0;
			server.use(
				http.post("*/api/auth/sign-in/email", async () => {
					requestCount += 1;

					if (requestCount === 1) {
						return HttpResponse.json(
							{
								code: "INVALID_PASSWORD",
								message: "Invalid password.",
							},
							{ status: 401 },
						);
					}

					await delay("infinite");
					return successfulSignInResponse();
				}),
			);

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
