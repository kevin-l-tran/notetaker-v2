import { Button, Dialog, Field, Form } from "@base-ui/react";
import { type Notebook, UpdateNotebookRequestSchema } from "@notetaker-v2/contracts";
import { useState } from "react";
import z from "zod";
import { ApiError, UnexpectedApiResponseError } from "../../../data/api/errors";
import { useUpdateNotebook } from "../../../data/api/mutations/updateNotebook";
import styles from "./UpdateNotebookDialog.module.css";

interface UpdateNotebookDialogProps {
	handle: Dialog.Handle<Notebook>;
}

export default function UpdateNotebookDialog({ handle }: UpdateNotebookDialogProps) {
	return (
		<Dialog.Root handle={handle}>
			{({ payload }) =>
				payload && (
					<Dialog.Portal>
						<Dialog.Backdrop className={styles.backdrop} />

						<Dialog.Popup className={styles.popup}>
							<Dialog.Title className={styles.title}>Update Notebook</Dialog.Title>

							<UpdateNotebookForm notebook={payload} handle={handle} />
						</Dialog.Popup>
					</Dialog.Portal>
				)
			}
		</Dialog.Root>
	);
}

function UpdateNotebookForm({
	notebook,
	handle,
}: {
	notebook: Notebook;
	handle: Dialog.Handle<Notebook>;
}) {
	const [title, setTitle] = useState(notebook.title);
	const [description, setDescription] = useState(notebook.description);
	const [errors, setErrors] = useState({});
	const [formError, setFormError] = useState<string | null>(null);

	const mutation = useUpdateNotebook(notebook.id);

	const submitForm = async (formValues: Form.Values) => {
		const parsedFormValues = UpdateNotebookRequestSchema.safeParse(formValues);

		if (!parsedFormValues.success) {
			return {
				errors: z.flattenError(parsedFormValues.error).fieldErrors,
			};
		}

		try {
			await mutation.mutateAsync(parsedFormValues.data);

			setFormError(null);
			handle.close();
		} catch (error) {
			if (error instanceof ApiError) {
				switch (error.code) {
					case "VALIDATION_ERROR":
						setFormError("Couldn't update the notebook. Please check your input and try again.");
						break;

					case "INTERNAL_SERVER_ERROR":
						setFormError("An unexpected error occured. Please try again.");
						break;

					default:
						setFormError("An unexpected error occured. Please try again.");
						break;
				}
			} else if (error instanceof UnexpectedApiResponseError) {
				setFormError("An unexpected error occured. Please try again.");
			} else {
				setFormError("An unexpected error occured. Please try again.");
			}
		}

		return { errors: {} };
	};

	return (
		<Form
			errors={errors}
			onFormSubmit={async (formValues) => {
				const response = await submitForm(formValues);
				setErrors(response.errors);
			}}
			className={styles.form}
		>
			<Field.Root name="title" className={styles.field}>
				<Field.Label className={styles.label}>
					<span>Title</span>

					<span className={styles.characterCount}>{title.length} / 60</span>
				</Field.Label>
				<Field.Control
					value={title}
					onChange={(event) => setTitle(event.currentTarget.value)}
					maxLength={60}
					className={styles.control}
					placeholder="Enter title..."
				/>
				<Field.Error className={styles.error} />
			</Field.Root>

			<Field.Root name="description" className={styles.field}>
				<Field.Label className={styles.label}>
					<span>Description (optional)</span>

					<span className={styles.characterCount}>{description?.length ?? 0} / 300</span>
				</Field.Label>
				<Field.Control
					render={<textarea />}
					value={description}
					onChange={(event) => setDescription(event.currentTarget.value)}
					maxLength={300}
					className={`${styles.control} ${styles.textarea}`}
					placeholder="Enter description..."
				/>
				<Field.Error className={styles.error} />
			</Field.Root>

			{formError && (
				<p className={styles.error} role="alert">
					{formError}
				</p>
			)}

			<Button type="submit" disabled={mutation.isPending} className={styles.submit}>
				{mutation.isPending ? "Updating..." : "Update"}
			</Button>
		</Form>
	);
}
