import type { NotebookId, UpdateNotebookRequest } from "@notetaker-v2/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notebooksQueryKey } from "../keys/notebooks";
import { updateNotebook } from "../notebooks";

export function useUpdateNotebook(notebookId: NotebookId) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: UpdateNotebookRequest) => updateNotebook({ notebookId, input }),
		onSuccess: async () => {
			return await queryClient.invalidateQueries({
				queryKey: notebooksQueryKey(),
			});
		},
	});
}
