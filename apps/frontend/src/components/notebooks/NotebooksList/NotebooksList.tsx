import type { AlertDialog, Dialog } from "@base-ui/react";
import type { Notebook } from "@notetaker-v2/contracts";
import NotebookRow from "./NotebookRow/NotebookRow";
import NotebooksEmptyState from "./NotebooksEmptyState";
import NotebooksErrorState from "./NotebooksErrorState";
import NotebooksSkeleton from "./NotebooksSkeleton";

interface NotebookListProps {
	notebooks?: Notebook[];
	isPending: boolean;
	error: Error | null;
	createNotebookHandle: Dialog.Handle<unknown>;
	updateNotebookHandle: Dialog.Handle<Notebook>;
	deleteNotebookHandle: AlertDialog.Handle<Notebook>;
	onRetry: () => void;
}

export default function NotebookList({
	notebooks,
	isPending,
	error,
	createNotebookHandle,
	updateNotebookHandle,
	deleteNotebookHandle,
	onRetry,
}: NotebookListProps) {
	if (isPending) {
		return <NotebooksSkeleton />;
	}

	if (error) {
		return <NotebooksErrorState onRetry={onRetry} />;
	}

	if (!notebooks || notebooks.length === 0) {
		return <NotebooksEmptyState createNotebookHandle={createNotebookHandle} />;
	}

	return notebooks.map((notebook) => (
		<NotebookRow
			notebook={notebook}
			key={notebook.id}
			updateNotebookHandle={updateNotebookHandle}
			deleteNotebookHandle={deleteNotebookHandle}
		/>
	));
}
