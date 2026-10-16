import type { NodeId, NotebookId, UpdateNodeRequest } from "@notetaker-v2/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateNode } from "../nodes";
import { nodesQueryKey } from "../queries/nodes";

export function useUpdateNode(notebookId: NotebookId) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: { nodeId: NodeId; data: UpdateNodeRequest }) =>
			updateNode({ notebookId, nodeId: input.nodeId, input: input.data }),
		onSuccess: () => {
			// do not wait for refetch to succeed; useful for autosave
			return void queryClient.invalidateQueries({
				queryKey: nodesQueryKey(notebookId),
			});
		},
	});
}
