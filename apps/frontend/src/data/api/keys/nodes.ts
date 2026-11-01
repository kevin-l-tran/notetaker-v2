import type { NodeId, NotebookId } from "@notetaker-v2/contracts";

export const nodeKeys = {
	nodes: (notebookId: NotebookId) => ["notebooks", notebookId, "nodes"] as const,

	node: (notebookId: NotebookId, nodeId: NodeId) =>
		[...nodeKeys.nodes(notebookId), nodeId] as const,

	draft: (notebookId: NotebookId, nodeId: NodeId) =>
		[...nodeKeys.nodes(notebookId), "draft", nodeId] as const,

	revisions: (notebookId: NotebookId, nodeId: NodeId) =>
		[...nodeKeys.nodes(notebookId), "revisions", nodeId] as const,

	revision: (notebookId: NotebookId, nodeId: NodeId, revisionNumber: number) =>
		[...nodeKeys.revisions(notebookId, nodeId), revisionNumber] as const,
};
