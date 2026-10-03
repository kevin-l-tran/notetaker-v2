import type { NotebookId } from "@notetaker-v2/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteNotebook } from "../notebooks";
import { notebooksQueryKey } from "../queries/notebooks";

export function useDeleteNotebook(notebookId: NotebookId) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => deleteNotebook({ notebookId }),
		onSuccess() {
			queryClient.invalidateQueries({
				queryKey: notebooksQueryKey(),
			});
		},
	});
}
