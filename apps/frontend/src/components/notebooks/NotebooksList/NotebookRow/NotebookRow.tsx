import type { Notebook } from "@notetaker-v2/contracts";
import NotebookOptions from "./NotebookOptions/NotebookOptions";
import styles from "./NotebookRow.module.css";

interface NotebookRowProps {
	notebook: Notebook;
}

export default function NotebookRow({ notebook }: NotebookRowProps) {
	return (
		<div className={`${styles.rowLayout} ${styles.row}`}>
			<NotebookOptions />
			<h2 className={styles.rowLineTitle}>{notebook.title}</h2>
			<p className={styles.rowLineDescription}>{notebook.description}</p>
			<p className={styles.rowLineDate}>{notebook.updatedAt}</p>
		</div>
	);
}
