import type { CreateNodeRequest, NodeDraftId, NodeId, NotebookId } from "@notetaker-v2/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { nodeKeys } from "../keys/nodes";
import { createDraft, deleteDraft, publishDraft, saveDraft } from "../nodeDrafts";
import { restoreRevision } from "../nodeRevisions";
import { createNode, deleteNode } from "../nodes";

export function useCreateNode(notebookId: NotebookId) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (input: CreateNodeRequest) => createNode({ notebookId, input }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: nodeKeys.nodes(notebookId), exact: true });
		},
	});
}

export function useDeleteNode(notebookId: NotebookId, nodeId: NodeId) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: () => deleteNode({ notebookId, nodeId }),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: nodeKeys.nodes(notebookId), exact: true });
		},
	});
}

export function useOpenDraft() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: createDraft,
		onSuccess: (draft, { notebookId, nodeId }) => {
			queryClient.setQueryData(nodeKeys.draft(notebookId, nodeId), draft);
			void queryClient.invalidateQueries({ queryKey: nodeKeys.nodes(notebookId), exact: true });
			void queryClient.invalidateQueries({
				queryKey: nodeKeys.node(notebookId, nodeId),
				exact: true,
			});
		},
	});
}

export function useSaveDraft() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: saveDraft,
		onSuccess: (draft, { notebookId, nodeId }) => {
			// Don't refetch the entire Yjs state after every autosave.
			queryClient.setQueryData(nodeKeys.draft(notebookId, nodeId), draft);
		},
	});
}

export function useDeleteDraft() {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: deleteDraft,
		onSuccess: (_result, { notebookId, nodeId }) => {
			queryClient.removeQueries({ queryKey: nodeKeys.draft(notebookId, nodeId), exact: true });
			void queryClient.invalidateQueries({ queryKey: nodeKeys.nodes(notebookId), exact: true });
			void queryClient.invalidateQueries({
				queryKey: nodeKeys.node(notebookId, nodeId),
				exact: true,
			});
		},
	});
}

export function usePublishDraft(notebookId: NotebookId, nodeId: NodeId, draftId: NodeDraftId) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (expectedSaveVersion: number) =>
			publishDraft({ notebookId, nodeId, draftId, input: { expectedSaveVersion } }),
		onSuccess: async () => {
			queryClient.removeQueries({ queryKey: nodeKeys.draft(notebookId, nodeId), exact: true });
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: nodeKeys.nodes(notebookId), exact: true }),
				queryClient.invalidateQueries({ queryKey: nodeKeys.node(notebookId, nodeId), exact: true }),
				queryClient.invalidateQueries({ queryKey: nodeKeys.revisions(notebookId, nodeId) }),
			]);
		},
	});
}

export function useRestoreRevision(notebookId: NotebookId, nodeId: NodeId) {
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (revisionNumber: number) => restoreRevision({ notebookId, nodeId, revisionNumber }),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: nodeKeys.draft(notebookId, nodeId),
					exact: true,
				}),
				queryClient.invalidateQueries({ queryKey: nodeKeys.nodes(notebookId), exact: true }),
				queryClient.invalidateQueries({ queryKey: nodeKeys.node(notebookId, nodeId), exact: true }),
			]);
		},
	});
}
