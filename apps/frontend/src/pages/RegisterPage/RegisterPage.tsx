import { Button, Field, Form } from "@base-ui/react";
import { useState } from "react";
import { Link, replace, useNavigate } from "react-router";
import { authClient } from "../../data/auth/authClient";
import { mapSignUpError } from "../../data/auth/authErrors";
import styles from "./RegisterPage.module.css";

export async function clientLoader() {
	const { data: session } = await authClient.getSession();

	if (session) {
		return replace("/notebooks");
	}

	return null;
}

export default function RegisterPage() {
	const [formError, setFormError] = useState<string>("");
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

	const navigate = useNavigate();

	const onSubmit = async ({ email, password }: { email: string; password: string }) => {
		setIsSubmitting(true);
		setFormError("");

		try {
			const result = await authClient.signUp.email({ email, password, name: email });

			if (result.error) {
				const mappedError = mapSignUpError(result.error);
				setFormError(mappedError.message);
			} else {
				navigate("/notebooks", { replace: true });
			}
		} catch {
			setFormError("Unable to create an account. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<main className={styles.page}>
			<div className={styles.card}>
				<header className={styles.header}>
					<h1>Create an account</h1>
					<p className={styles.subtitle}>Start creating notebooks.</p>
				</header>

				<Form onFormSubmit={onSubmit} className={styles.form}>
					<Field.Root name="email" className={styles.field}>
						<Field.Label className={styles.label}>Email</Field.Label>
						<Field.Control type="email" autoComplete="email" required className={styles.input} />
						<Field.Error className={styles.error} />
					</Field.Root>

					<Field.Root name="password" className={styles.field}>
						<Field.Label className={styles.label}>Password</Field.Label>
						<Field.Control
							type="password"
							autoComplete="new-password"
							minLength={8}
							maxLength={128}
							required
							className={styles.input}
						/>
						<Field.Error className={styles.error} />
					</Field.Root>

					{formError && (
						<p className={styles.error} role="alert">
							{formError}
						</p>
					)}

					<Button type="submit" disabled={isSubmitting} className={styles.submit}>
						{isSubmitting ? "Creating account..." : "Create account"}
					</Button>
				</Form>

				<p className={styles.disclaimer}>
					Already have an account?{" "}
					<Link to="/login" className={styles.link}>
						Log in
					</Link>
				</p>
			</div>
		</main>
	);
}
