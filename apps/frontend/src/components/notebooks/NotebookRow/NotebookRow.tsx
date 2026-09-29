import type { Notebook } from "@notetaker-v2/contracts";
import styles from "./NotebookRow.module.css";

interface NotebookRowProps {
	notebook: Notebook;
}

export default function NotebookRow({ notebook }: NotebookRowProps) {
	return (
		<div className={styles.row}>
			<h2>{notebook.title}</h2>
			<p>{notebook.description}</p>
			<p>{notebook.updatedAt}</p>
		</div>
	);
}
