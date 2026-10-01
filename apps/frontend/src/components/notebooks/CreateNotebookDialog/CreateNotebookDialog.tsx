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
	const [titleLength, setTitleLength] = useState(0);
	const [descriptionLength, setDescriptionLength] = useState(0);
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
							setTitleLength(0);
							setDescriptionLength(0);
							setErrors({});

							const response = await submitForm(formValues);
							setErrors(response.errors);
						}}
						className={styles.form}
					>
						<Field.Root name="title" className={styles.field}>
							<Field.Label className={styles.label}>
								<p>Title</p>

								<p className={styles.characterCount}>{titleLength} / 60</p>
							</Field.Label>
							<Field.Control
								maxLength={60}
								onChange={(event) => {
									setTitleLength(event.currentTarget.value.length);
								}}
								className={styles.control}
								placeholder="Enter title..."
							/>
							<Field.Error className={styles.error} />
						</Field.Root>

						<Field.Root name="description" className={styles.field}>
							<Field.Label className={styles.label}>
								<p>Description (optional)</p>

								<p className={styles.characterCount}>{descriptionLength} / 300</p>
							</Field.Label>
							<Field.Control
								render={<textarea />}
								maxLength={300}
								onChange={(event) => {
									setDescriptionLength(event.currentTarget.value.length);
								}}
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
