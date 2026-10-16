import type { NodeId, NotebookId } from "@notetaker-v2/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteNode } from "../nodes";
import { nodesQueryKey } from "../queries/nodes";

export function useDeleteNode(notebookId: NotebookId, nodeId: NodeId) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => deleteNode({ notebookId, nodeId }),
		onSuccess: async () => {
			return await queryClient.invalidateQueries({
				queryKey: nodesQueryKey(notebookId),
			});
		},
	});
}
