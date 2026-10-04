import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HttpResponse, http } from "msw/http";
import { delay } from "msw/utils/delay";
import { createRoutesStub } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import RegisterPage, { clientLoader } from "../../../src/pages/RegisterPage/RegisterPage";
import { server } from "../../mocks/server";

const user = {
	id: crypto.randomUUID(),
	name: "user@example.com",
	email: "user@example.com",
	emailVerified: true,
	image: null,
	createdAt: "2026-10-01T00:00:00.000Z",
	updatedAt: "2026-10-01T00:00:00.000Z",
};

const session = {
	id: crypto.randomUUID(),
	userId: user.id,
	token: "test-token",
	expiresAt: "2026-10-10T00:00:00.000Z",
	createdAt: "2026-10-01T00:00:00.000Z",
	updatedAt: "2026-10-01T00:00:00.000Z",
};

function successfulSignUpResponse() {
	return HttpResponse.json({
		token: "test-token",
		user,
	});
}

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
		cleanup();
	});

	describe("client loader", () => {
		it("redirects authenticated users to notebooks", async () => {
			server.use(
				http.get("*/api/auth/get-session", () => {
					return HttpResponse.json({ session, user });
				}),
			);

			const result = await clientLoader();

			expect(result).toBeInstanceOf(Response);
			expect(result?.status).toBe(302);
			expect(result?.headers.get("Location")).toBe("/notebooks");
		});

		it("allows unauthenticated users to view register", async () => {
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
		it("renders the register form", () => {
			renderRegisterPage();

			expect(screen.getByLabelText("Email")).toBeInTheDocument();
			expect(screen.getByLabelText("Password")).toBeInTheDocument();
			expect(screen.getByRole("button", { name: "Create account" })).toBeInTheDocument();
		});

		it("does not submit an empty form", async () => {
			let requestCount = 0;
			server.use(
				http.post("*/api/auth/sign-up/email", () => {
					requestCount += 1;
					return successfulSignUpResponse();
				}),
			);

			renderRegisterPage();
			const user = userEvent.setup();

			await user.click(screen.getByRole("button", { name: "Create account" }));

			expect(requestCount).toBe(0);
		});

		it("submits the entered credentials", async () => {
			let requestBody: unknown;
			server.use(
				http.post("*/api/auth/sign-up/email", async ({ request }) => {
					requestBody = await request.json();
					return successfulSignUpResponse();
				}),
			);

			renderRegisterPage();
			const user = await fillForm();

			await user.click(screen.getByRole("button", { name: "Create account" }));

			await waitFor(() => {
				expect(requestBody).toEqual({
					email: "user@example.com",
					password: "password123",
					name: "user@example.com",
				});
			});
		});

		it("navigates to notebooks after successful sign up", async () => {
			server.use(http.post("*/api/auth/sign-up/email", () => successfulSignUpResponse()));

			renderRegisterPage();
			const user = await fillForm();

			await user.click(screen.getByRole("button", { name: "Create account" }));

			expect(await screen.findByText("Notebooks")).toBeInTheDocument();
		});

		it("shows a duplicate user error", async () => {
			server.use(
				http.post("*/api/auth/sign-up/email", () => {
					return HttpResponse.json(
						{
							code: "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
							message: "User already exists.",
						},
						{ status: 422 },
					);
				}),
			);

			renderRegisterPage();
			const user = await fillForm();

			await user.click(screen.getByRole("button", { name: "Create account" }));

			expect(await screen.findByRole("alert")).toHaveTextContent(
				"An account with this email already exists.",
			);
		});

		it("shows a generic error when the request fails", async () => {
			server.use(http.post("*/api/auth/sign-up/email", () => HttpResponse.error()));

			renderRegisterPage();
			const user = await fillForm();

			await user.click(screen.getByRole("button", { name: "Create account" }));

			expect(await screen.findByRole("alert")).toHaveTextContent(
				"Unable to create an account. Please try again.",
			);
		});

		it("disables the submit button while signing up", async () => {
			server.use(
				http.post("*/api/auth/sign-up/email", async () => {
					await delay("infinite");
					return successfulSignUpResponse();
				}),
			);

			renderRegisterPage();
			const user = await fillForm();

			await user.click(screen.getByRole("button", { name: "Create account" }));

			expect(screen.getByRole("button", { name: "Creating account..." })).toBeDisabled();
		});

		it("clears a previous authentication error when retrying", async () => {
			let requestCount = 0;
			server.use(
				http.post("*/api/auth/sign-up/email", async () => {
					requestCount += 1;

					if (requestCount === 1) {
						return HttpResponse.json(
							{
								code: "PASSWORD_TOO_SHORT",
								message: "Password is too short.",
							},
							{ status: 400 },
						);
					}

					await delay("infinite");
					return successfulSignUpResponse();
				}),
			);

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
