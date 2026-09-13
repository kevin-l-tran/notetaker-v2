import { UserSchema } from "@notetaker-v2/contracts";
import { queryOptions } from "@tanstack/react-query";

export const authenticatedUserQueryKey = () => ["authenticatedUser"] as const;

async function fetchAuthenticatedUser() {
	const response = await fetch("/api/me");

	if (!response.ok) {
		throw new Error("Failed to fetch user.");
	}

	const data = await response.json();
	return UserSchema.parse(data);
}

export function authenticatedUserQuery() {
	return queryOptions({
		queryKey: authenticatedUserQueryKey(),
		queryFn: fetchAuthenticatedUser,
		staleTime: 60000,
	});
}
