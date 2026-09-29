import type { Notebook } from "@notetaker-v2/contracts";
import NotebookRow from "./NotebookRow/NotebookRow";
import NotebooksEmptyState from "./NotebooksEmptyState";
import NotebooksErrorState from "./NotebooksErrorState";
import NotebooksSkeleton from "./NotebooksSkeleton";

interface NotebookListProps {
	notebooks?: Notebook[];
	isPending: boolean;
	error: Error | null;
	onRetry: () => void;
	onNewNotebook: () => void;
}

export default function NotebookList({
	notebooks,
	isPending,
	error,
	onRetry,
	onNewNotebook,
}: NotebookListProps) {
	if (isPending) {
		return <NotebooksSkeleton />;
	}

	if (error) {
		return <NotebooksErrorState onRetry={onRetry} />;
	}

	if (!notebooks || notebooks.length === 0) {
		return <NotebooksEmptyState onNewNotebook={onNewNotebook} />;
	}

	return notebooks.map((notebook) => <NotebookRow notebook={notebook} key={notebook.id} />);
}
