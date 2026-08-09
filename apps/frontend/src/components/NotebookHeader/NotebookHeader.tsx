import Logo from "../Logo/Logo";
import NotebookTabs from "../NotebookTabs/NotebookTabs";
import styles from "./NotebookHeader.module.css"

export default function NotebookHeader() {
	return (
		<header className={styles.header}>
			<div className={styles.navigation}>
				<Logo />

				<NotebookTabs />
			</div>
		</header>
	);
}
