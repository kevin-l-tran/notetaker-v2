import { act, renderHook } from "@testing-library/react";
import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";
import useLogout from "../../src/hooks/useLogout";
import { server } from "../mocks/server";

const { clearQueryClient, navigate } = vi.hoisted(() => ({
	clearQueryClient: vi.fn(),
	navigate: vi.fn(),
}));

vi.mock("../../src/data/queryClient", () => ({
	default: {
		clear: clearQueryClient,
	},
}));

vi.mock("react-router", () => ({
	useNavigate: () => navigate,
}));

describe("useLogout", () => {
	afterEach(() => {
		clearQueryClient.mockReset();
		navigate.mockReset();
		vi.restoreAllMocks();
	});

	it("clears the query cache and navigates to login after signing out", async () => {
		server.use(
			http.post("*/api/auth/sign-out", () => {
				return HttpResponse.json({
					success: true,
				});
			}),
		);

		const { result } = renderHook(() => useLogout());

		await act(async () => {
			await result.current.logout();
		});

		expect(clearQueryClient).toHaveBeenCalledOnce();
		expect(navigate).toHaveBeenCalledWith("/login", { replace: true });
		expect(result.current.hasError).toBe(false);
		expect(result.current.isLoggingOut).toBe(false);
	});

	it("reports an error without clearing the cache or navigating when sign out fails", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});

		server.use(
			http.post("*/api/auth/sign-out", () => {
				return HttpResponse.json(
					{
						code: "SIGN_OUT_FAILED",
						message: "Failed to sign out",
					},
					{ status: 500 },
				);
			}),
		);

		const { result } = renderHook(() => useLogout());

		await act(async () => {
			await result.current.logout();
		});

		expect(result.current.hasError).toBe(true);
		expect(result.current.isLoggingOut).toBe(false);
		expect(clearQueryClient).not.toHaveBeenCalled();
		expect(navigate).not.toHaveBeenCalled();
	});

	it("reports an error without clearing the cache or navigating when sign out request fails", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});

		server.use(
			http.post("*/api/auth/sign-out", () => {
				return HttpResponse.error();
			}),
		);

		const { result } = renderHook(() => useLogout());

		await act(async () => {
			await result.current.logout();
		});

		expect(result.current.hasError).toBe(true);
		expect(result.current.isLoggingOut).toBe(false);
		expect(clearQueryClient).not.toHaveBeenCalled();
		expect(navigate).not.toHaveBeenCalled();
	});
});
