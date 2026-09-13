import useLogout from "../../hooks/useLogout";
import Logo from "../Logo/Logo";
import NotebookTabs from "../NotebookTabs/NotebookTabs";
import styles from "./NotebookHeader.module.css";

export default function NotebookHeader() {
	const { logout, isLoggingOut } = useLogout();

	return (
		<header className={styles.header}>
			<div className={styles.navigation}>
				<Logo />

				<NotebookTabs />
			</div>
			<button onClick={logout} disabled={isLoggingOut} type="button" className={styles.logout}>
				Log out
			</button>
		</header>
	);
}
