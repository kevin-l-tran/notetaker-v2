import type { NodeId, NotebookId } from "@notetaker-v2/contracts";
import { queryOptions } from "@tanstack/react-query";
import { nodeKeys } from "../keys/nodes";
import { fetchDraft } from "../nodeDrafts";
import { fetchRevision, fetchRevisions } from "../nodeRevisions";
import { fetchNode, fetchNodes } from "../nodes";

export function nodesQuery(notebookId: NotebookId) {
	return queryOptions({
		queryKey: nodeKeys.nodes(notebookId),
		queryFn: () => fetchNodes({ notebookId }),
	});
}

export function nodeQuery(notebookId: NotebookId, nodeId: NodeId) {
	return queryOptions({
		queryKey: nodeKeys.node(notebookId, nodeId),
		queryFn: () => fetchNode({ notebookId, nodeId }),
	});
}

export const draftQuery = (notebookId: NotebookId, nodeId: NodeId) =>
	queryOptions({
		queryKey: nodeKeys.draft(notebookId, nodeId),
		queryFn: () => fetchDraft({ notebookId, nodeId }),
	});

export const revisionsQuery = (notebookId: NotebookId, nodeId: NodeId) =>
	queryOptions({
		queryKey: nodeKeys.revisions(notebookId, nodeId),
		queryFn: () => fetchRevisions({ notebookId, nodeId }),
	});

export const revisionQuery = (notebookId: NotebookId, nodeId: NodeId, revisionNumber: number) =>
	queryOptions({
		queryKey: nodeKeys.revision(notebookId, nodeId, revisionNumber),
		queryFn: () => fetchRevision({ notebookId, nodeId, revisionNumber }),
	});
