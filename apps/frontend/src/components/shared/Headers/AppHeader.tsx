import useLogout from "../../../hooks/useLogout";
import Logo from "../Logo/Logo";
import styles from "./Header.module.css";

export default function AppHeader() {
	const { logout, isLoggingOut } = useLogout();

	return (
		<header className={styles.header}>
			<div className={styles.navigation}>
				<Logo />
			</div>

			<button onClick={logout} disabled={isLoggingOut} type="button" className={styles.logout}>
				Log out
			</button>
		</header>
	);
}
