import { Button, Dialog, Field, Form } from "@base-ui/react";
import { CreateNotebookRequestSchema } from "@notetaker-v2/contracts";
import { useState } from "react";
import z from "zod";
import { useCreateNotebook } from "../../../data/api/mutations/createNotebook";
import styles from "./CreateNotebookDialog.module.css";

interface CreateNotebookDialogProps {
	handle: Dialog.Handle<unknown>;
}

export default function CreateNotebookDialog({ handle }: CreateNotebookDialogProps) {
	const [errors, setErrors] = useState({});

	const mutation = useCreateNotebook();

	const submitForm = async (formValues: Form.Values) => {
		const parsedFormValues = CreateNotebookRequestSchema.safeParse(formValues);

		if (!parsedFormValues.success) {
			return {
				errors: z.flattenError(parsedFormValues.error).fieldErrors,
			};
		}

		await mutation.mutateAsync(parsedFormValues.data);

		return { errors: {} };
	};

	return (
		<Dialog.Root handle={handle}>
			<Dialog.Portal>
				<Dialog.Backdrop className={styles.backdrop} />

				<Dialog.Popup className={styles.popup}>
					<Dialog.Title className={styles.title}>Create Notebook</Dialog.Title>

					<Form
						errors={errors}
						onFormSubmit={async (formValues) => {
							const response = await submitForm(formValues);
							setErrors(response.errors);
						}}
						className={styles.form}
					>
						<Field.Root name="title" className={styles.field}>
							<Field.Label className={styles.label}>Title</Field.Label>
							<Field.Control className={styles.control} placeholder="Enter title..." />
							<Field.Error className={styles.error} />
						</Field.Root>

						<Field.Root name="description" className={styles.field}>
							<Field.Label className={styles.label}>Description (optional)</Field.Label>
							<Field.Control
								render={<textarea />}
								className={`${styles.control} ${styles.textarea}`}
								placeholder="Enter description..."
							/>
							<Field.Error className={styles.error} />
						</Field.Root>

						<Button type="submit" className={styles.submit}>
							Create
						</Button>
					</Form>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
