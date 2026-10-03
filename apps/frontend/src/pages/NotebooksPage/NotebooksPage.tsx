import { AlertDialog, Dialog, Input, Select } from "@base-ui/react";
import type { Notebook } from "@notetaker-v2/contracts";
import { useQuery } from "@tanstack/react-query";
import { CheckIcon, SortAscIcon, SortDescIcon } from "lucide-react";
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
	const [sort, setSort] = useState<string | null>(null);

	const sortOptions = [
		{ label: "Recently updated", value: "updated-desc" },
		{ label: "Title A-Z", value: "name-asc" },
		{ label: "Title Z-A", value: "name-desc" },
	] as const;

	const processedNotebooks = data
		?.filter(
			(n) =>
				n.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()) ||
				n.description?.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
		)
		.sort((a, b) => {
			switch (sort) {
				case "updated-desc":
					return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();

				case "name-asc":
					return a.title.localeCompare(b.title);

				case "name-desc":
					return b.title.localeCompare(a.title);

				default:
					return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
			}
		});

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

				<div className={styles.controls}>
					<Input
						value={query}
						onValueChange={setQuery}
						className={styles.search}
						placeholder="Search notebooks..."
						disabled={isPending || !!error}
					/>

					<Select.Root items={sortOptions} value={sort} onValueChange={setSort}>
						<Select.Trigger className={styles.sortTrigger} aria-label="Sort notebooks">
							<Select.Value placeholder="Sort by" className={styles.sortValue} />
							<Select.Icon className={styles.sortIcon}>
								{sort?.includes("asc") ? <SortAscIcon /> : <SortDescIcon />}
							</Select.Icon>
						</Select.Trigger>

						<Select.Portal>
							<Select.Positioner className={styles.sortPositioner} sideOffset={4}>
								<Select.Popup className={styles.sortPopup}>
									<Select.List className={styles.sortList}>
										{sortOptions.map(({ label, value }) => (
											<Select.Item className={styles.sortItem} key={label} value={value}>
												<Select.ItemIndicator className={styles.sortIndicator}>
													<CheckIcon />
												</Select.ItemIndicator>
												<Select.ItemText className={styles.sortItemText}>{label}</Select.ItemText>
											</Select.Item>
										))}
									</Select.List>
								</Select.Popup>
							</Select.Positioner>
						</Select.Portal>
					</Select.Root>
				</div>

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
