import { AlertDialog, Dialog, Input } from "@base-ui/react";
import type { Notebook } from "@notetaker-v2/contracts";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import CreateNotebookDialog from "../../components/notebooks/CreateNotebookDialog/CreateNotebookDialog";
import DeleteNotebookDialog from "../../components/notebooks/DeleteNotebookDialog/DeleteNotebookDialog";
import NotebookList from "../../components/notebooks/NotebooksList/NotebooksList";
import UpdateNotebookDialog from "../../components/notebooks/UpdateNotebookDialog/UpdateNotebookDialog";
import AppHeader from "../../components/shared/Headers/AppHeader";
import { notebooksQuery } from "../../data/api/queries/notebooks";
import styles from "./NotebooksPage.module.css";

const createDialog = Dialog.createHandle();
const updateDialog = Dialog.createHandle<Notebook>();
const deleteDialog = AlertDialog.createHandle<Notebook>();

export default function NotebooksPage() {
	const { isPending, error, data, refetch } = useQuery(notebooksQuery());

	const [query, setQuery] = useState("");

	const processedNotebooks = data?.filter((n) =>
		n.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
	);

	return (
		<div className={styles.page}>
			<AppHeader />

			<main className={styles.main}>
				<div className={styles.heading}>
					<h1>Notebooks</h1>

					<Dialog.Trigger className={styles.newNotebook} handle={createDialog}>
						New Notebook
					</Dialog.Trigger>
				</div>

				<Input
					value={query}
					onValueChange={setQuery}
					className={styles.search}
					placeholder="Search notebooks..."
					disabled={isPending || !!error}
				/>

				<div className={styles.notebooks}>
					<NotebookList
						notebooks={processedNotebooks}
						isPending={isPending}
						error={error}
						onRetry={() => void refetch()}
						createNotebookHandle={createDialog}
						updateNotebookHandle={updateDialog}
						deleteNotebookHandle={deleteDialog}
					/>
				</div>

				<CreateNotebookDialog handle={createDialog} />
				<UpdateNotebookDialog handle={updateDialog} />
				<DeleteNotebookDialog handle={deleteDialog} />
			</main>
		</div>
	);
}
