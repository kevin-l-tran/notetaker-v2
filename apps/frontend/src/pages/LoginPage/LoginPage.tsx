import { Button, Field, Form } from "@base-ui/react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { authClient } from "../../data/auth/authClient";
import { mapAuthError } from "../../data/auth/authErrors";
import styles from "./LoginPage.module.css";

export default function LoginPage() {
	const [errors, setErrors] = useState<Form.Props["errors"]>({});
	const [formError, setFormError] = useState<string>("");
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

	const navigate = useNavigate();

	const onSubmit = async ({ email, password }: { email: string; password: string }) => {
		setIsSubmitting(true);
		setErrors({});

		try {
			const result = await authClient.signIn.email({ email, password });

			if (result.error) {
				const mappedError = mapAuthError(result.error);
				setFormError(mappedError.message);
			} else {
				navigate("/notebooks");
			}
		} catch {
			setFormError("Unable to sign in. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<main className={styles.page}>
			<div className={styles.card}>
				<header className={styles.header}>
					<h1>Sign in</h1>
					<p className={styles.subtitle}>Continue to your notebooks.</p>
				</header>

				<Form onFormSubmit={onSubmit} errors={errors} className={styles.form}>
					<Field.Root name="email" className={styles.field}>
						<Field.Label className={styles.label}>Email</Field.Label>
						<Field.Control type="email" autoComplete="email" required className={styles.input} />
						<Field.Error className={styles.error} />
					</Field.Root>

					<Field.Root name="password" className={styles.field}>
						<Field.Label className={styles.label}>Password</Field.Label>
						<Field.Control
							type="password"
							autoComplete="current-password"
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
						{isSubmitting ? "Signing in..." : "Sign in"}
					</Button>
				</Form>
			</div>
		</main>
	);
}
