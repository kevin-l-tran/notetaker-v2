import type { NodeDraftId, NodeId, NotebookId, SaveDraftRequest } from "@notetaker-v2/contracts";

export type OpenDraftOperation = (params: { notebookId: NotebookId; nodeId: NodeId }) => Promise<{
	id: NodeDraftId;
	state: string;
	saveVersion: number;
}>;

export type SaveDraftOperation = (params: {
	notebookId: NotebookId;
	nodeId: NodeId;
	draftId: NodeDraftId;
	input: SaveDraftRequest;
}) => Promise<{ saveVersion: number }>;

export type DeleteDraftOperation = (params: {
	notebookId: NotebookId;
	nodeId: NodeId;
	draftId: NodeDraftId;
}) => Promise<void>;
