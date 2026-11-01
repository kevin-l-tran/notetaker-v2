import type { NotebookId } from "@notetaker-v2/contracts";

export const nodesQueryKey = (notebookId: NotebookId) =>
	["notebooks", notebookId, "nodes"] as const;
