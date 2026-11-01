import { useMutation, useQueryClient } from "@tanstack/react-query";
import { notebooksQueryKey } from "../keys/notebooks";
import { createNotebook } from "../notebooks";

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
