import { Button, Input } from "@base-ui/react";
import { useQuery } from "@tanstack/react-query";
import NotebookList from "../../components/notebooks/NotebooksList/NotebooksList";
import AppHeader from "../../components/shared/Headers/AppHeader";
import { notebooksQuery } from "../../data/api/queries/notebooks";
import styles from "./NotebooksPage.module.css";

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

					<Button className={styles.newNotebook} type="button" onClick={handleNewNotebook}>
						New Notebook
					</Button>
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
						onNewNotebook={handleNewNotebook}
					/>
				</div>
			</main>
		</div>
	);
}
