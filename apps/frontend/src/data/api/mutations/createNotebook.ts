import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createNotebook } from "../notebooks";
import { notebooksQueryKey } from "../queries/notebooks";

export function useCreateNotebook() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: createNotebook,
		onSuccess: async () => {
			return await queryClient.invalidateQueries({
				queryKey: notebooksQueryKey(),
			});
		},
	});
}
