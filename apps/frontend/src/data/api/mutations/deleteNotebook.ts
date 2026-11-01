import type { NotebookId } from "@notetaker-v2/contracts";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notebooksQueryKey } from "../keys/notebooks";
import { deleteNotebook } from "../notebooks";

export function useDeleteNotebook(notebookId: NotebookId) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: () => deleteNotebook({ notebookId }),
		onSuccess: async () => {
			return await queryClient.invalidateQueries({
				queryKey: notebooksQueryKey(),
			});
		},
	});
}
