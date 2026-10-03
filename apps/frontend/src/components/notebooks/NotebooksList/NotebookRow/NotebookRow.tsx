import type { AlertDialog, Dialog } from "@base-ui/react";
import type { Notebook } from "@notetaker-v2/contracts";
import NotebookOptions from "./NotebookOptions/NotebookOptions";
import styles from "./NotebookRow.module.css";

interface NotebookRowProps {
	notebook: Notebook;
	updateNotebookHandle: Dialog.Handle<Notebook>;
	deleteNotebookHandle: AlertDialog.Handle<Notebook>;
}

export default function NotebookRow({
	notebook,
	updateNotebookHandle,
	deleteNotebookHandle,
}: NotebookRowProps) {
	return (
		<div className={`${styles.rowLayout} ${styles.row}`}>
			<NotebookOptions
				onUpdateNotebook={() => {
					updateNotebookHandle.openWithPayload(notebook);
				}}
				onDeleteNotebook={() => {
					deleteNotebookHandle.openWithPayload(notebook);
				}}
			/>
			<h2 className={styles.rowLineTitle}>{notebook.title}</h2>
			<p className={styles.rowLineDescription}>{notebook.description}</p>
			<p className={styles.rowLineDate}>{notebook.updatedAt}</p>
		</div>
	);
}
