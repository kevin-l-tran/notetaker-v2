import type { NotebookId } from "@notetaker-v2/contracts";
import { queryOptions } from "@tanstack/react-query";
import { nodeKeys } from "../keys/nodes";
import { fetchNodes } from "../nodes";

export function nodesQuery(notebookId: NotebookId) {
	return queryOptions({
		queryKey: nodeKeys.nodes(notebookId),
		queryFn: () => fetchNodes({ notebookId }),
	});
}
