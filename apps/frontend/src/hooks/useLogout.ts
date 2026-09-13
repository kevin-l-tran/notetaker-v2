import { useState } from "react";
import { useNavigate } from "react-router";
import { authClient } from "../data/auth/authClient";
import queryClient from "../data/queryClient";

export default function useLogout() {
	const [hasError, setHasError] = useState<boolean>(false);
	const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

	const navigate = useNavigate();

	async function logout() {
		setHasError(false);
		setIsLoggingOut(true);

		try {
			const result = await authClient.signOut();

			if (result.error) {
				setHasError(true);
			} else {
				queryClient.clear();
				navigate("/login", { replace: true });
			}
		} catch {
			setHasError(true);
		} finally {
			setIsLoggingOut(false);
		}
	}

	return { logout, hasError, isLoggingOut };
}
