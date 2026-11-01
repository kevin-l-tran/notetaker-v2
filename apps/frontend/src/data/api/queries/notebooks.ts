import { queryOptions } from "@tanstack/react-query";
import { notebooksQueryKey } from "../keys/notebooks";
import { fetchNotebooks } from "../notebooks";

export function notebooksQuery() {
	return queryOptions({
		queryKey: notebooksQueryKey(),
		queryFn: fetchNotebooks,
	});
}
