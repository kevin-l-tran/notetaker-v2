import { queryOptions } from "@tanstack/react-query";
import { fetchNotebooks } from "../notebooks";

export const notebooksQueryKey = () => ["notebooks"] as const;

export function notebooksQuery() {
	return queryOptions({
		queryKey: notebooksQueryKey(),
		queryFn: fetchNotebooks,
	});
}
