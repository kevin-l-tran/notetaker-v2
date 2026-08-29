import NotebookHeader from "../components/NotebookHeader/NotebookHeader";
import EditorPage from "../pages/EditorPage/EditorPage";
import styles from "./App.module.css";

function App() {
	return (
		<div className={styles.app}>
			<NotebookHeader />
			<main>
				<EditorPage />
			</main>
		</div>
	);
}

export default App;
