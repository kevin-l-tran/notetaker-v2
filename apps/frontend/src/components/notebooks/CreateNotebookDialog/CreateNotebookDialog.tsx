import { Button, Dialog, Field, Form } from "@base-ui/react";
import { CreateNotebookRequestSchema } from "@notetaker-v2/contracts";
import { useState } from "react";
import z from "zod";
import { ApiError, UnexpectedApiResponseError } from "../../../data/api/errors";
import { useCreateNotebook } from "../../../data/api/mutations/createNotebook";
import styles from "./CreateNotebookDialog.module.css";

interface CreateNotebookDialogProps {
	handle: Dialog.Handle<unknown>;
}

export default function CreateNotebookDialog({ handle }: CreateNotebookDialogProps) {
	const [title, setTitle] = useState("");
	const [description, setDescription] = useState("");
	const [errors, setErrors] = useState({});
	const [formError, setFormError] = useState<string | null>(null);

	const mutation = useCreateNotebook();

	const submitForm = async (formValues: Form.Values) => {
		const parsedFormValues = CreateNotebookRequestSchema.safeParse(formValues);

		if (!parsedFormValues.success) {
			return {
				errors: z.flattenError(parsedFormValues.error).fieldErrors,
			};
		}

		try {
			await mutation.mutateAsync(parsedFormValues.data);

			setTitle("");
			setDescription("");
			setFormError(null);
			handle.close();
		} catch (error) {
			if (error instanceof ApiError) {
				switch (error.code) {
					case "VALIDATION_ERROR":
						setFormError("Couldn't create the notebook. Please check your input and try again.");
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

								<span className={styles.characterCount}>{description.length} / 300</span>
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
							{mutation.isPending ? "Creating..." : "Create"}
						</Button>
					</Form>
				</Dialog.Popup>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
