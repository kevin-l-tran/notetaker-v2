import { redirect } from "react-router";
import { authClient } from "../data/auth/authClient";

export const requireAuthentication = async () => {
	const { data: session, error } = await authClient.getSession();

	if (error) {
		throw error;
	}

	if (!session) {
		throw redirect("/login");
	}
};
