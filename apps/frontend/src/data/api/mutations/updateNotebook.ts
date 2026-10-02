import type { NotebookId, UpdateNotebookRequest } from "@notetaker-v2/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateNotebook } from "../notebooks";
import { notebooksQueryKey } from "../queries/notebooks";

export function useUpdateNotebook(notebookId: NotebookId) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (input: UpdateNotebookRequest) => updateNotebook({ notebookId, input }),
		onSuccess() {
			queryClient.invalidateQueries({
				queryKey: notebooksQueryKey(),
			});
		},
	});
}
