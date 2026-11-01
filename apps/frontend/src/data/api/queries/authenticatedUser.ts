import { queryOptions } from "@tanstack/react-query";
import { fetchAuthenticatedUser } from "../authenticatedUser";
import { authenticatedUserQueryKey } from "../keys/authenticatedUser";

export function authenticatedUserQuery() {
	return queryOptions({
		queryKey: authenticatedUserQueryKey(),
		queryFn: fetchAuthenticatedUser,
		staleTime: 60000,
	});
}
