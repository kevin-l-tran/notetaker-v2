import { Dialog } from "@base-ui/react";
import styles from "./NotebooksList.module.css";

interface NotebooksEmptyStateProps {
	createNotebookHandle: Dialog.Handle<unknown>;
}

export default function NotebooksEmptyState({ createNotebookHandle }: NotebooksEmptyStateProps) {
	return (
		<div className={styles.nullState}>
			<h2>No notebooks yet</h2>
			<p>Create a notebook to start organizing your notes.</p>

			<Dialog.Trigger className={styles.secondaryButton} handle={createNotebookHandle}>
				New Notebook
			</Dialog.Trigger>
		</div>
	);
}
