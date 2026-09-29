import { Dialog, Input } from "@base-ui/react";
import { useQuery } from "@tanstack/react-query";
import CreateNotebookDialog from "../../components/notebooks/CreateNotebookDialog/CreateNotebookDialog";
import NotebookList from "../../components/notebooks/NotebooksList/NotebooksList";
import AppHeader from "../../components/shared/Headers/AppHeader";
import { notebooksQuery } from "../../data/api/queries/notebooks";
import styles from "./NotebooksPage.module.css";

const createDialog = Dialog.createHandle();

export default function NotebooksPage() {
	const { isPending, error, data, refetch } = useQuery(notebooksQuery());

	const handleNewNotebook = () => {
		// open create notebook ui
	};

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
					className={styles.search}
					placeholder="Search notebooks..."
					disabled={isPending || !!error}
				/>

				<div className={styles.notebooks}>
					<NotebookList
						notebooks={data}
						isPending={isPending}
						error={error}
						onRetry={() => void refetch()}
						createNotebookHandle={createDialog}
					/>
				</div>

				<CreateNotebookDialog handle={createDialog} onNewNotebook={handleNewNotebook} />
			</main>
		</div>
	);
}
