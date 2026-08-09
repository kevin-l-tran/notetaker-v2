import NotebookHeader from "../components/NotebookHeader/NotebookHeader";
import styles from "./App.module.css";

function App() {
	return (
		<div className={styles.app}>
			<NotebookHeader />
			<main>This is my cool app</main>
		</div>
	);
}

export default App;
