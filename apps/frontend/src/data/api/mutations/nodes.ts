import type {
	CreateNodeRequest,
	NodeDraftId,
	NodeId,
	NotebookId,
	SaveDraftRequest,
} from "@notetaker-v2/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { nodeKeys } from "../keys/nodes";
import { createDraft, publishDraft, saveDraft } from "../nodeDrafts";
import { restoreRevision } from "../nodeRevisions";
import { createNode, deleteNode } from "../nodes";

export function useCreateNode(notebookId: NotebookId) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: CreateNodeRequest) => createNode({ notebookId, input }),
		onSuccess: async () => {
			return await queryClient.invalidateQueries({
				queryKey: nodeKeys.nodes(notebookId),
			});
		},
	});
}

export function useDeleteNode(notebookId: NotebookId, nodeId: NodeId) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => deleteNode({ notebookId, nodeId }),
		onSuccess: async () => {
			return await queryClient.invalidateQueries({
				queryKey: nodeKeys.nodes(notebookId),
			});
		},
	});
}

export function useOpenDraft(notebookId: NotebookId, nodeId: NodeId) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => createDraft({ notebookId, nodeId }),

		onSuccess: (draft) => {
			queryClient.setQueryData(nodeKeys.draft(notebookId, nodeId), draft);
			queryClient.invalidateQueries({
				queryKey: nodeKeys.node(notebookId, nodeId),
			});
		},
	});
}

export function useSaveDraft(notebookId: NotebookId, nodeId: NodeId, draftId: NodeDraftId) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: SaveDraftRequest) =>
			saveDraft({
				notebookId,
				nodeId,
				draftId,
				input,
			}),

		onSuccess: (draft) => {
			queryClient.setQueryData(nodeKeys.draft(notebookId, nodeId), draft);
			queryClient.invalidateQueries({
				queryKey: nodeKeys.draft(notebookId, nodeId),
			});
		},
	});
}

export function usePublishDraft(notebookId: NotebookId, nodeId: NodeId, draftId: NodeDraftId) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (expectedSaveVersion: number) =>
			publishDraft({
				notebookId,
				nodeId,
				draftId,
				input: { expectedSaveVersion },
			}),

		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: nodeKeys.nodes(notebookId),
				}),
				queryClient.invalidateQueries({
					queryKey: nodeKeys.node(notebookId, nodeId),
				}),
				queryClient.invalidateQueries({
					queryKey: nodeKeys.revisions(notebookId, nodeId),
				}),
			]);
		},
	});
}

export function useRestoreRevision(notebookId: NotebookId, nodeId: NodeId) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (revisionNumber: number) => restoreRevision({ notebookId, nodeId, revisionNumber }),
		onSuccess: async () => {
			return await queryClient.invalidateQueries({
				queryKey: nodeKeys.draft(notebookId, nodeId),
			});
		},
	});
}
