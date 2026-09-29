import { Button, Input } from "@base-ui/react";
import NotebookRow from "../../components/notebooks/NotebookRow/NotebookRow";
import AppHeader from "../../components/shared/Headers/AppHeader";
import styles from "./NotebooksPage.module.css";

export default function NotebooksPage() {
	return (
		<div className={styles.page}>
			<AppHeader />

			<main className={styles.main}>
				<div className={styles.heading}>
					<h1>Notebooks</h1>

					<Button className={styles.newNotebook} type="button">
						New Notebook
					</Button>
				</div>

				<Input className={styles.search} placeholder="Search notebooks..." />

				<div className={styles.notebooks}>
					<NotebookRow
						notebook={{
							id: "test-id",
							title: "Notebook 1",
							description: "Description of this notebook",
							settings: {},
							createdAt: "2026-09-29T20:01:37.394Z",
							updatedAt: "2026-09-29T20:01:37.394Z",
						}}
					/>
					<NotebookRow
						notebook={{
							id: "test-id",
							title: "Notebook 2",
							description: "Description of this notebook",
							settings: {},
							createdAt: "2026-09-29T20:01:37.394Z",
							updatedAt: "2026-09-29T20:01:37.394Z",
						}}
					/>
					<NotebookRow
						notebook={{
							id: "test-id",
							title: "Notebook 3",
							description: "Description of this notebook",
							settings: {},
							createdAt: "2026-09-29T20:01:37.394Z",
							updatedAt: "2026-09-29T20:01:37.394Z",
						}}
					/>
				</div>
			</main>
		</div>
	);
}
