import EditorSidebar from "../../components/EditorSidebar/EditorSidebar";
import NodeEditor from "../../components/NodeEditor/NodeEditor";
import styles from "./EditorPage.module.css";

export default function EditorPage() {
	return (
		<div className={styles.editorPage}>
			<EditorSidebar />

			<NodeEditor />
		</div>
	);
}
