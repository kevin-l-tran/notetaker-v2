import type { CreateNodeRequest, NotebookId } from "@notetaker-v2/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createNode } from "../nodes";
import { nodesQueryKey } from "../queries/nodes";

export function useCreateNode(notebookId: NotebookId) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: CreateNodeRequest) => createNode({ notebookId, input }),
		onSuccess: async () => {
			return await queryClient.invalidateQueries({
				queryKey: nodesQueryKey(notebookId),
			});
		},
	});
}
