import type { AlertDialog, Dialog } from "@base-ui/react";
import type { Notebook } from "@notetaker-v2/contracts";
import { NavLink } from "react-router";
import { formatRelativePastTime } from "../../../../utils/formatTime";
import NotebookOptions from "./NotebookOptions/NotebookOptions";
import styles from "./NotebookRow.module.css";

type NotebookRowProps = {
	notebook: Notebook;
	updateNotebookHandle: Dialog.Handle<Notebook>;
	deleteNotebookHandle: AlertDialog.Handle<Notebook>;
};

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

			<NavLink to={`/notebooks/${notebook.id}/edit`} className={styles.rowLink}>
				<h2 className={styles.rowLineTitle}>{notebook.title}</h2>
				<p className={styles.rowLineDescription}>{notebook.description}</p>
				<p className={styles.rowLineDate}>Updated {formatRelativePastTime(notebook.updatedAt)}</p>
			</NavLink>
		</div>
	);
}
