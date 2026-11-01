import type { CreateNodeRequest, NotebookId } from "@notetaker-v2/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { nodeKeys } from "../keys/nodes";
import { createNode } from "../nodes";

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
