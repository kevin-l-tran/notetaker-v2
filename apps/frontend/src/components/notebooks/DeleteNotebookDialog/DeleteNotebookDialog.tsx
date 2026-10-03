import { AlertDialog, Button } from "@base-ui/react";
import type { Notebook } from "@notetaker-v2/contracts";
import { useState } from "react";
import { ApiError, UnexpectedApiResponseError } from "../../../data/api/errors";
import { useDeleteNotebook } from "../../../data/api/mutations/deleteNotebook";
import styles from "./DeleteNotebookDialog.module.css";

interface DeleteNotebookDialogProps {
	handle: AlertDialog.Handle<Notebook>;
}

export default function DeleteNotebookDialog({ handle }: DeleteNotebookDialogProps) {
	return (
		<AlertDialog.Root handle={handle}>
			{({ payload }) =>
				payload && (
					<AlertDialog.Portal>
						<AlertDialog.Backdrop className={styles.backdrop} />

						<DeleteNotebookPopup handle={handle} notebook={payload} />
					</AlertDialog.Portal>
				)
			}
		</AlertDialog.Root>
	);
}

function DeleteNotebookPopup({
	notebook,
	handle,
}: {
	notebook: Notebook;
	handle: AlertDialog.Handle<Notebook>;
}) {
	const [formError, setFormError] = useState<string | null>(null);

	const mutation = useDeleteNotebook(notebook.id);

	const onDelete = async () => {
		try {
			await mutation.mutateAsync();
			handle.close();
		} catch (error) {
			if (error instanceof ApiError) {
				switch (error.code) {
					case "INTERNAL_SERVER_ERROR":
						setFormError("An unexpected error occurred. Please try again.");
						break;

					default:
						setFormError("An unexpected error occurred. Please try again.");
						break;
				}
			} else if (error instanceof UnexpectedApiResponseError) {
				setFormError("An unexpected error occurred. Please try again.");
			} else {
				setFormError("An unexpected error occurred. Please try again.");
			}
		}
	};

	return (
		<AlertDialog.Popup className={styles.popup}>
			<AlertDialog.Title className={styles.title}>Delete Notebook?</AlertDialog.Title>
			<AlertDialog.Description className={styles.description}>
				Delete "${notebook.title}"? This action cannot be undone.
			</AlertDialog.Description>

			{formError && (
				<p className={styles.error} role="alert">
					{formError}
				</p>
			)}

			<div className={styles.buttonRow}>
				<AlertDialog.Close disabled={mutation.isPending} className={styles.cancel}>
					Cancel
				</AlertDialog.Close>

				<Button
					type="button"
					onClick={onDelete}
					disabled={mutation.isPending}
					className={styles.delete}
				>
					{mutation.isPending ? "Deleting..." : "Delete"}
				</Button>
			</div>
		</AlertDialog.Popup>
	);
}
