import type { NotebookId } from "@notetaker-v2/contracts";
import { queryOptions } from "@tanstack/react-query";
import { fetchNodes } from "../nodes";

export const nodesQueryKey = (notebookId: NotebookId) =>
	["notebooks", notebookId, "nodes"] as const;

export function nodesQuery(notebookId: NotebookId) {
	return queryOptions({
		queryKey: nodesQueryKey(notebookId),
		queryFn: () => fetchNodes({ notebookId }),
	});
}
