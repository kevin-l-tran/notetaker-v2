import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import useLogout from "./useLogout";

const { signOut, clearQueryClient, navigate } = vi.hoisted(() => ({
	signOut: vi.fn(),
	clearQueryClient: vi.fn(),
	navigate: vi.fn(),
}));

vi.mock("../data/auth/authClient", () => ({
	authClient: {
		signOut,
	},
}));

vi.mock("../data/queryClient", () => ({
	default: {
		clear: clearQueryClient,
	},
}));

vi.mock("react-router", () => ({
	useNavigate: () => navigate,
}));

describe("useLogout", () => {
	afterEach(() => {
		signOut.mockReset();
		clearQueryClient.mockReset();
		navigate.mockReset();
		vi.restoreAllMocks();
	});

	it("clears the query cache and navigates to login after signing out", async () => {
		signOut.mockResolvedValue({
			data: {},
			error: null,
		});

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

		signOut.mockResolvedValue({
			data: null,
			error: {
				message: "Failed to sign out",
			},
		});

		const { result } = renderHook(() => useLogout());

		await act(async () => {
			await result.current.logout();
		});

		expect(result.current.hasError).toBe(true);
		expect(result.current.isLoggingOut).toBe(false);
		expect(clearQueryClient).not.toHaveBeenCalled();
		expect(navigate).not.toHaveBeenCalled();
	});

	it("reports an error without clearing the cache or navigating when sign out throws", async () => {
		vi.spyOn(console, "error").mockImplementation(() => {});

		signOut.mockRejectedValue(new Error("Network error"));

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
