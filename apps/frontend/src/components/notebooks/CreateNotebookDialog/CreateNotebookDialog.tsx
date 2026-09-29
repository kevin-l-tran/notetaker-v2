import { Button, Dialog, Field, Form } from "@base-ui/react";
import styles from "./CreateNotebookDialog.module.css";

interface CreateNotebookDialogProps {
	handle: Dialog.Handle<unknown>;
	onNewNotebook: () => void;
}

export default function CreateNotebookDialog({ handle, onNewNotebook }: CreateNotebookDialogProps) {
	return (
		<Dialog.Root handle={handle}>
			<Dialog.Portal>
				<Dialog.Backdrop className={styles.backdrop} />

				<Dialog.Popup className={styles.popup}>
					<Dialog.Title className={styles.title}>Create Notebook</Dialog.Title>

					<Form className={styles.form} onSubmit={onNewNotebook}>
						<Field.Root className={styles.field}>
							<Field.Label className={styles.label}>Title</Field.Label>
							<Field.Control className={styles.control} placeholder="Enter title..." />
							<Field.Error className={styles.error} />
						</Field.Root>

						<Field.Root className={styles.field}>
							<Field.Label className={styles.label}>Description</Field.Label>
							<Field.Control
								render={<textarea />}
								className={`${styles.control} ${styles.textarea}`}
								placeholder="Enter description..."
							/>
							<Field.Error className={styles.error} />
						</Field.Root>

						<Button className={styles.submit} type="submit">
							Create
						</Button>
					</Form>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
