import { Separator } from "@base-ui/react/separator";
import styles from "./NotebookTabs.module.css";

export default function NotebookTabs() {
	return (
		<div className={styles.tabs}>
			<nav>Workspace</nav>
			<Separator orientation="vertical" className={styles.separator} />
			<nav>Editor</nav>
		</div>
	);
}
