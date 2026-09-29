import { Button } from "@base-ui/react";
import styles from "./NotebooksList.module.css";

interface NotebooksErrorStateProps {
	onRetry: () => void;
}

export default function NotebooksErrorState({ onRetry }: NotebooksErrorStateProps) {
	return (
		<div className={styles.nullState}>
			<h2>Couldn't load notebooks</h2>
			<p>Something went wrong while loading your notebooks.</p>

			<Button className={styles.secondaryButton} type="button" onClick={onRetry}>
				Try again
			</Button>
		</div>
	);
}
