import { Button } from "@base-ui/react";
import styles from "./NotebooksList.module.css";

interface NotebooksEmptyStateProps {
	onNewNotebook: () => void;
}

export default function NotebooksEmptyState({ onNewNotebook }: NotebooksEmptyStateProps) {
	return (
		<div className={styles.nullState}>
			<h2>No notebooks yet</h2>
			<p>Create a notebook to start organizing your notes.</p>

			<Button className={styles.secondaryButton} type="button" onClick={onNewNotebook}>
				New Notebook
			</Button>
		</div>
	);
}
