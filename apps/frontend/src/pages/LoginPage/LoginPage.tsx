import { Button, Field, Form } from "@base-ui/react";
import styles from "./LoginPage.module.css";

export default function LoginPage() {
	return (
		<main className={styles.page}>
			<div className={styles.card}>
				<header className={styles.header}>
					<h1>Sign in</h1>
					<p className={styles.subtitle}>Continue to your notebooks.</p>
				</header>

				<Form className={styles.form}>
					<Field.Root name="email" className={styles.field}>
						<Field.Label className={styles.label}>Email</Field.Label>
						<Field.Control type="email" required className={styles.input} />{" "}
					</Field.Root>

					<Field.Root name="password" className={styles.field}>
						<Field.Label className={styles.label}>Password</Field.Label>
						<Field.Control type="password" required className={styles.input} />
					</Field.Root>

					<Button className={styles.submit}>Sign in</Button>
				</Form>
			</div>
		</main>
	);
}
